import logging
import razorpay
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..database import get_db, Developer, APIKey, BillingTransaction, AuditEvent
from ..auth import generate_api_key, get_current_developer
from ..config import settings

logger = logging.getLogger("trace.api")

rzp_client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

router = APIRouter()


# --- Request / Response Models ---

class DeveloperResponse(BaseModel):
    email: str
    balance_usdc: float
    active_keys: list[str]

class APIKeyRequest(BaseModel):
    is_test: bool = False
    scope: str = "full_access"

class APIKeyResponse(BaseModel):
    key: str
    is_test: bool
    scope: str

class CheckoutRequest(BaseModel):
    amount_usdc: float = 20.0

class CheckoutResponse(BaseModel):
    order_id: str
    amount_inr: int
    key_id: str

class TransactionResponse(BaseModel):
    id: int
    amount_usdc: float
    balance_after: float
    transaction_type: str
    endpoint: Optional[str] = None
    created_at: str

class AuditEventResponse(BaseModel):
    id: int
    event_type: str
    description: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str

class SettingsRequest(BaseModel):
    webhook_url: Optional[str] = None
    notification_email: Optional[str] = None

class SettingsResponse(BaseModel):
    webhook_url: Optional[str] = None
    notification_email: Optional[str] = None


# --- Helpers ---

async def _record_audit(db: AsyncSession, dev: Developer, event_type: str, description: str, request: Request):
    """Record an audit event."""
    audit = AuditEvent(
        developer_id=dev.id,
        event_type=event_type,
        description=description,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:256],
    )
    db.add(audit)


@retry(
    stop=stop_after_attempt(settings.external_api_max_retries),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    reraise=True,
)
def _create_razorpay_order(amount_inr: int, dev_id: str, amount_usdc: float) -> dict:
    """Create Razorpay order with retry logic."""
    return rzp_client.order.create({
        "amount": amount_inr,
        "currency": "INR",
        "notes": {
            "dev_id": str(dev_id),
            "amount_usdc": str(amount_usdc)
        }
    })


# --- Endpoints ---

@router.get("/me", response_model=DeveloperResponse)
async def get_me(dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APIKey).filter(APIKey.developer_id == dev.id, APIKey.is_active == True))
    keys = result.scalars().all()
    prefixes = [k.key_prefix for k in keys]
    return DeveloperResponse(
        email=dev.email,
        balance_usdc=dev.balance_usdc,
        active_keys=prefixes
    )


@router.post("/keys", response_model=APIKeyResponse)
async def create_key(request: Request, req: APIKeyRequest, dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    # Validate scope
    valid_scopes = {"full_access", "read_only", "billing"}
    if req.scope not in valid_scopes:
        raise HTTPException(status_code=400, detail=f"Invalid scope. Must be one of: {', '.join(valid_scopes)}")

    raw_key, hashed_key = generate_api_key(is_test=req.is_test)
    prefix = raw_key[:12] + "..."
    
    api_key = APIKey(
        developer_id=dev.id,
        key_prefix=prefix,
        hashed_key=hashed_key,
        is_test=req.is_test,
        scope=req.scope
    )
    db.add(api_key)
    
    # Record audit event
    await _record_audit(db, dev, "key_created", f"Created {'test' if req.is_test else 'live'} key with scope '{req.scope}': {prefix}", request)
    
    await db.commit()
    
    return {"key": raw_key, "is_test": req.is_test, "scope": req.scope}


@router.delete("/keys/{key_id}")
async def revoke_key(request: Request, key_id: int, dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    """Revoke (deactivate) an API key."""
    result = await db.execute(
        select(APIKey).filter(APIKey.id == key_id, APIKey.developer_id == dev.id, APIKey.is_active == True)
    )
    api_key = result.scalars().first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found or already revoked")
    
    api_key.is_active = False
    
    # Record audit event
    await _record_audit(db, dev, "key_revoked", f"Revoked key: {api_key.key_prefix}", request)
    
    await db.commit()
    return {"status": "revoked", "key_prefix": api_key.key_prefix}


@router.post("/keys/{key_id}/rotate", response_model=APIKeyResponse)
async def rotate_key(request: Request, key_id: int, dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    """Atomically rotate an API key: revoke old + create new in one transaction."""
    result = await db.execute(
        select(APIKey).filter(APIKey.id == key_id, APIKey.developer_id == dev.id, APIKey.is_active == True)
    )
    old_key = result.scalars().first()
    
    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found or already revoked")
    
    # Revoke old key
    old_key.is_active = False
    
    # Create new key with same settings
    raw_key, hashed_key = generate_api_key(is_test=old_key.is_test)
    prefix = raw_key[:12] + "..."
    
    new_key = APIKey(
        developer_id=dev.id,
        key_prefix=prefix,
        hashed_key=hashed_key,
        is_test=old_key.is_test,
        scope=old_key.scope
    )
    db.add(new_key)
    
    # Record audit event
    await _record_audit(db, dev, "key_rotated", f"Rotated key {old_key.key_prefix} → {prefix}", request)
    
    await db.commit()
    
    return {"key": raw_key, "is_test": old_key.is_test, "scope": old_key.scope}


@router.get("/transactions", response_model=list[TransactionResponse])
async def get_transactions(
    dev: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Get billing transaction history for the authenticated developer."""
    if limit > 200:
        limit = 200

    result = await db.execute(
        select(BillingTransaction)
        .filter(BillingTransaction.developer_id == dev.id)
        .order_by(BillingTransaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    txns = result.scalars().all()
    
    return [
        TransactionResponse(
            id=t.id,
            amount_usdc=t.amount_usdc,
            balance_after=t.balance_after,
            transaction_type=t.transaction_type,
            endpoint=t.endpoint,
            created_at=t.created_at.isoformat() if t.created_at else "",
        )
        for t in txns
    ]


@router.get("/audit", response_model=list[AuditEventResponse])
async def get_audit_log(
    dev: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Get user-facing audit log for the authenticated developer."""
    if limit > 200:
        limit = 200

    result = await db.execute(
        select(AuditEvent)
        .filter(AuditEvent.developer_id == dev.id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    events = result.scalars().all()
    
    return [
        AuditEventResponse(
            id=e.id,
            event_type=e.event_type,
            description=e.description,
            ip_address=e.ip_address,
            created_at=e.created_at.isoformat() if e.created_at else "",
        )
        for e in events
    ]


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(dev: Developer = Depends(get_current_developer)):
    """Get account settings."""
    return SettingsResponse(
        webhook_url=dev.webhook_url,
        notification_email=dev.notification_email,
    )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    request: Request,
    req: SettingsRequest,
    dev: Developer = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    """Update account settings (webhook URL, notification email)."""
    changes = []
    if req.webhook_url is not None:
        dev.webhook_url = req.webhook_url
        changes.append(f"webhook_url={'set' if req.webhook_url else 'cleared'}")
    if req.notification_email is not None:
        dev.notification_email = req.notification_email
        changes.append(f"notification_email={'set' if req.notification_email else 'cleared'}")

    if changes:
        await _record_audit(db, dev, "settings_updated", ", ".join(changes), request)
        await db.commit()

    return SettingsResponse(
        webhook_url=dev.webhook_url,
        notification_email=dev.notification_email,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(request: Request, req: CheckoutRequest, dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    if req.amount_usdc < 5.0:
        raise HTTPException(status_code=400, detail="Minimum top-up is $5.00")
        
    try:
        amount_inr = int(req.amount_usdc * 85 * 100) # Assuming 1 USDC = 85 INR, converting to paise
        order = _create_razorpay_order(amount_inr, dev.id, req.amount_usdc)
        
        # Record audit event
        await _record_audit(db, dev, "checkout", f"Created checkout for ${req.amount_usdc:.2f} USDC", request)
        await db.commit()
        
        return CheckoutResponse(
            order_id=order["id"],
            amount_inr=amount_inr,
            key_id=settings.razorpay_key_id
        )
    except Exception as e:
        logger.error(f"Checkout creation failed for developer {dev.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Payment processing error. Please try again.")


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("x-razorpay-signature")

    try:
        rzp_client.utility.verify_webhook_signature(
            payload.decode("utf-8"),
            sig_header,
            settings.razorpay_webhook_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    data = json.loads(payload)
    if data.get('event') == 'payment.captured' or data.get('event') == 'order.paid':
        entity = data['payload']['payment']['entity']
        payment_id = entity.get('id')
        notes = entity.get('notes', {})
        dev_id_str = notes.get('dev_id')
        amount_usdc_str = notes.get('amount_usdc')
        
        if dev_id_str and amount_usdc_str and payment_id:
            dev_id = dev_id_str # Supabase UUID
            amount_usdc = float(amount_usdc_str)
            
            result = await db.execute(select(Developer).filter(Developer.id == dev_id))
            dev = result.scalars().first()
            if dev:
                # Use a nested transaction to catch idempotency collisions
                try:
                    async with db.begin_nested():
                        txn = BillingTransaction(
                            developer_id=dev.id,
                            amount_usdc=amount_usdc,
                            balance_after=dev.balance_usdc + amount_usdc,
                            transaction_type="top_up",
                            razorpay_payment_id=payment_id
                        )
                        db.add(txn)
                        dev.balance_usdc += amount_usdc
                except IntegrityError:
                    # Idempotency lock - duplicate payment_id
                    return {"status": "success", "detail": "Already processed"}
                
                await db.commit()
            
    return {"status": "success"}
