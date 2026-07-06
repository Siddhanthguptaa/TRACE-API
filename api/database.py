import os
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, Index
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./trace.db")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine_kwargs = {"echo": False}
if "postgresql" in DATABASE_URL:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 0

if os.environ.get("TESTING"):
    from sqlalchemy.pool import NullPool
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs.pop("pool_size", None)
    engine_kwargs.pop("max_overflow", None)

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


class Developer(Base):
    __tablename__ = "developers"

    # In Supabase Auth, user IDs are UUIDs. We'll store it as a string to match Supabase's auth.users id.
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    balance_usdc = Column(Float, default=0.0)
    webhook_url = Column(String, nullable=True)
    notification_email = Column(String, nullable=True)
    
    api_keys = relationship("APIKey", back_populates="developer")
    transactions = relationship("BillingTransaction", back_populates="developer")
    audit_events = relationship("AuditEvent", back_populates="developer")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(String, ForeignKey("developers.id"), nullable=False)
    key_prefix = Column(String, index=True, nullable=False)  # First 8 chars
    hashed_key = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    is_test = Column(Boolean, default=False)
    scope = Column(String, default="full_access") # e.g. read_only, billing, full_access
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    developer = relationship("Developer", back_populates="api_keys")


class BillingTransaction(Base):
    """Audit trail for every balance change (charge or top-up)."""
    __tablename__ = "billing_transactions"

    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(String, ForeignKey("developers.id"), nullable=False)
    amount_usdc = Column(Float, nullable=False)  # negative for charges, positive for top-ups
    balance_after = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)  # "api_call", "top_up", "refund"
    endpoint = Column(String, nullable=True)  # e.g., "/v1/score"
    provider_id = Column(String, nullable=True)  # which provider was scored
    razorpay_payment_id = Column(String, unique=True, nullable=True)  # for webhook idempotency
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    developer = relationship("Developer", back_populates="transactions")


class AuditEvent(Base):
    """User-facing audit log: key generated, key revoked, login, failed attempts, settings changes."""
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    developer_id = Column(String, ForeignKey("developers.id"), nullable=False)
    event_type = Column(String, nullable=False)  # "key_created", "key_revoked", "key_rotated", "login", "login_failed", "settings_updated", "checkout"
    description = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    developer = relationship("Developer", back_populates="audit_events")


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


class GraphScore(Base):
    """Pre-computed graph metrics for O(1) reads by the API workers."""
    __tablename__ = "graph_scores"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(String, unique=True, index=True, nullable=False)
    pagerank = Column(Float, default=0.0)
    clustering = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
