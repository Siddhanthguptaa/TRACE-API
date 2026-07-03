import asyncio
import httpx

async def test_register():
    async with httpx.AsyncClient() as client:
        # We need to start the server first to test this properly, or just use the local db
        pass

if __name__ == "__main__":
    pass
