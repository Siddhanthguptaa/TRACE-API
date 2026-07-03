import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, Index
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./trace.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


class Developer(Base):
    __tablename__ = "developers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    balance_usdc = Column(Float, default=0.0)
    
    api_keys = relationship("APIKey", back_populates="developer")
    transactions = relationship("BillingTransaction", back_populates="developer")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=False)
    key_prefix = Column(String, index=True, nullable=False)  # First 8 chars
    hashed_key = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)

    developer = relationship("Developer", back_populates="api_keys")


class BillingTransaction(Base):
    """Audit trail for every balance change (charge or top-up)."""
    __tablename__ = "billing_transactions"

    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(Integer, ForeignKey("developers.id"), nullable=False)
    amount_usdc = Column(Float, nullable=False)  # negative for charges, positive for top-ups
    balance_after = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)  # "api_call", "top_up", "refund"
    endpoint = Column(String, nullable=True)  # e.g., "/v1/score"
    provider_id = Column(String, nullable=True)  # which provider was scored
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    developer = relationship("Developer", back_populates="transactions")


class ProviderRecord(Base):
    """Persistent provider history — survives restarts."""
    __tablename__ = "provider_records"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(String, unique=True, index=True, nullable=False)
    completed_jobs = Column(Integer, default=0)
    failed_jobs = Column(Integer, default=0)
    total_jobs = Column(Integer, default=0)
    cusum_state = Column(Float, default=0.0)
    ema_default_rate = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TrustEdge(Base):
    """Persistent trust graph edges — survives restarts."""
    __tablename__ = "trust_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, index=True, nullable=False)  # buyer
    target_id = Column(String, index=True, nullable=False)  # provider
    weight = Column(Integer, default=1)  # number of successful interactions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", name="uq_trust_edge"),
    )


class EventRecord(Base):
    """Event records for deduplication and audit trail."""
    __tablename__ = "event_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True, nullable=False)  # Unique job identifier
    provider_id = Column(String, index=True, nullable=False)
    buyer_id = Column(String, index=True, nullable=False)
    reporter_id = Column(String, index=True, nullable=False)  # API key owner who reported
    capability = Column(String, nullable=True)
    price_usdc = Column(Float, nullable=True)
    success = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

