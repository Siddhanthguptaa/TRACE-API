import os
os.environ["TESTING"] = "1"

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"
