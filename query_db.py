import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./trace.db")

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, email, balance_usdc FROM developers"))
        developers = result.fetchall()
        for dev in developers:
            print(f"ID: {dev[0]}, Email: {dev[1]}, Balance: {dev[2]}")

if __name__ == "__main__":
    asyncio.run(main())
