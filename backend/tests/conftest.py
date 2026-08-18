"""
Pytest Global Test Fixtures and Configuration.
"""

import os
import sys

import pytest

# Ensure backend and root are in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.database import close_db, init_db
from app.redis_client import close_redis, get_redis, init_redis


@pytest.fixture(autouse=True)
async def setup_test_environment():
    """Initialise test database and redis connections for each test."""
    await init_db()
    await init_redis()
    redis_client = get_redis()
    try:
        await redis_client.flushdb()
    except Exception:
        pass
    yield
    try:
        await redis_client.flushdb()
    except Exception:
        pass
    await close_redis()
    await close_db()
