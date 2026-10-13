"""SQLAlchemy async engine and session factory."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

engine = create_async_engine(
    settings.async_database_url or "postgresql+asyncpg://localhost/syntrix",
    pool_pre_ping=True,
    echo=settings.app_env == "development" and False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            try:
                if session.is_active:
                    await session.commit()
            except Exception:
                try:
                    await session.rollback()
                except Exception:
                    pass
        except Exception:
            try:
                if session.is_active:
                    await session.rollback()
            except Exception:
                pass
            raise
