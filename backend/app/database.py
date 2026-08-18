"""
AgentShield Database Module.

Provides async SQLAlchemy engine, session factory, and base model.

WHY async SQLAlchemy:
- FastAPI is async-native; blocking DB calls would defeat the purpose
- asyncpg is the fastest PostgreSQL driver for Python
- Async sessions allow concurrent request handling
- Non-blocking I/O ensures low latency for WAF operations

HOW it fits:
- All models inherit from Base (defined here)
- All services receive an AsyncSession via dependency injection
- Alembic uses the sync URL for migrations
"""

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


# These are initialised in init_db() during app startup
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """
    Initialise the async database engine and session factory.

    Called during FastAPI startup event.
    """
    global _engine, _session_factory
    settings = get_settings()

    _engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,  # Detect stale connections
        pool_recycle=300,  # Recycle connections every 5 minutes
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    logger.info(
        "Database engine initialised",
        extra={"component": "database", "host": settings.postgres_host},
    )


async def close_db() -> None:
    """
    Close the database engine and release all connections.

    Called during FastAPI shutdown event.
    """
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("Database engine closed", extra={"component": "database"})


async def get_db_session() -> AsyncSession:
    """
    Dependency that provides an async database session.

    Usage in FastAPI:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            ...

    The session is automatically committed on success
    and rolled back on exception.
    """
    if _session_factory is None:
        raise RuntimeError("Database not initialised. Call init_db() first.")

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_health() -> bool:
    """
    Check database connectivity for health endpoint.

    Returns True if a simple query succeeds, False otherwise.
    """
    if _engine is None:
        return False
    try:
        async with _engine.connect() as conn:
            from sqlalchemy import text

            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(
            "Database health check failed",
            extra={"component": "database", "error": str(e)},
        )
        return False
