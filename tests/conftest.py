import os
os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_trace.db"

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"
