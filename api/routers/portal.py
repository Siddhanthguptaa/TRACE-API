import os
import razorpay
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from ..database import get_db, Developer, APIKey
from ..auth import (
    get_password_hash, verify_password, create_access_token, 
    generate_api_key, get_current_developer, ACCESS_TOKEN_EXPIRE_MINUTES
)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mock")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "mock_secret")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "whsec_mock")

rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

router = APIRouter()

class UserAuth(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class DeveloperResponse(BaseModel):
    email: str
    balance_usdc: float
    active_keys: list[str]

class APIKeyResponse(BaseModel):
    key: str

class CheckoutRequest(BaseModel):
    amount_usdc: float = 20.0

class CheckoutResponse(BaseModel):
    order_id: str
    amount_inr: int
    key_id: str

@router.post("/register", response_model=Token)
async def register(user: UserAuth, db: AsyncSession = Depends(get_db)):
    if not user.email.strip() or not user.password.strip():
        raise HTTPException(status_code=400, detail="Email and password cannot be empty")
        
    result = await db.execute(select(Developer).filter(Developer.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    try:
        hashed = get_password_hash(user.password)
        dev = Developer(email=user.email, hashed_password=hashed)
        db.add(dev)
        await db.commit()
        await db.refresh(dev)
    except Exception as e:
        import traceback
        raise HTTPException(status_code=400, detail=f"DB Error: {str(e)} | Trace: {traceback.format_exc()}")
    
    access_token = create_access_token(
        data={"sub": dev.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user: UserAuth, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Developer).filter(Developer.email == user.email))
    dev = result.scalars().first()
    if not dev or not verify_password(user.password, dev.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    access_token = create_access_token(
        data={"sub": dev.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

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
async def create_key(dev: Developer = Depends(get_current_developer), db: AsyncSession = Depends(get_db)):
    raw_key, hashed_key = generate_api_key()
    prefix = raw_key[:12] + "..."
    
    api_key = APIKey(
        developer_id=dev.id,
        key_prefix=prefix,
        hashed_key=hashed_key
    )
    db.add(api_key)
    await db.commit()
    
    return {"key": raw_key}

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(req: CheckoutRequest, dev: Developer = Depends(get_current_developer)):
    if req.amount_usdc < 5.0:
        raise HTTPException(status_code=400, detail="Minimum top-up is $5.00")
        
    try:
        amount_inr = int(req.amount_usdc * 85 * 100) # Assuming 1 USDC = 85 INR, converting to paise
        order = rzp_client.order.create({
            "amount": amount_inr,
            "currency": "INR",
            "notes": {
                "dev_id": str(dev.id),
                "amount_usdc": str(req.amount_usdc)
            }
        })
        return CheckoutResponse(
            order_id=order["id"],
            amount_inr=amount_inr,
            key_id=RAZORPAY_KEY_ID
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("x-razorpay-signature")

    try:
        rzp_client.utility.verify_webhook_signature(
            payload.decode("utf-8"),
            sig_header,
            RAZORPAY_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    data = json.loads(payload)
    if data.get('event') == 'payment.captured' or data.get('event') == 'order.paid':
        entity = data['payload']['payment']['entity']
        notes = entity.get('notes', {})
        dev_id_str = notes.get('dev_id')
        amount_usdc_str = notes.get('amount_usdc')
        
        if dev_id_str and amount_usdc_str:
            dev_id = int(dev_id_str)
            amount_usdc = float(amount_usdc_str)
            
            result = await db.execute(select(Developer).filter(Developer.id == dev_id))
            dev = result.scalars().first()
            if dev:
                dev.balance_usdc += amount_usdc
                await db.commit()
            
    return {"status": "success"}
