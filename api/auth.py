import os
import hashlib
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from .database import get_db, Developer, APIKey, BillingTransaction

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week
API_CALL_COST = float(os.getenv("API_CALL_COST", "0.005"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
api_key_security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str]:
    """Returns (raw_key, hashed_key)"""
    raw_key = f"sk_live_{secrets.token_urlsafe(32)}"
    return raw_key, hash_api_key(raw_key)


async def get_current_developer(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
) -> Developer:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    result = await db.execute(select(Developer).filter(Developer.email == email))
    developer = result.scalars().first()
    if developer is None:
        raise HTTPException(status_code=401, detail="Developer not found")
    return developer


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(api_key_security),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify API key and atomically charge the developer.
    
    Uses SELECT FOR UPDATE to prevent race conditions when checking
    and deducting balance concurrently.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing API Key in Authorization header")
    
    raw_key = credentials.credentials
    hashed = hash_api_key(raw_key)
    
    # Find the API key
    result = await db.execute(
        select(APIKey).filter(APIKey.hashed_key == hashed, APIKey.is_active == True)
    )
    api_key = result.scalars().first()
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API Key")
        
    # Lock the developer row for update to prevent race conditions
    dev_result = await db.execute(
        select(Developer).filter(Developer.id == api_key.developer_id).with_for_update()
    )
    developer = dev_result.scalars().first()
    
    if not developer:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    # Check and deduct balance atomically
    charge_amount = API_CALL_COST
    if developer.balance_usdc < charge_amount:
        raise HTTPException(status_code=402, detail="Insufficient balance. Please top up your account.")
        
    # Deduct balance and record transaction
    developer.balance_usdc -= charge_amount
    
    txn = BillingTransaction(
        developer_id=developer.id,
        amount_usdc=-charge_amount,
        balance_after=developer.balance_usdc,
        transaction_type="api_call",
        endpoint="/v1/score",
    )
    db.add(txn)
    await db.commit()
    
    return developer