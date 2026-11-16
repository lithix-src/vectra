"""Async SQLAlchemy Session & Multi-Tenant Row-Level Security (RLS) Context Manager."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator

from sqlalchemy import ColumnElement, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .models import Base

DEFAULT_SQLITE_PATH = Path(__file__).resolve().parents[1] / "vectra_intel.db"
DATABASE_URL = os.getenv(
    "VECTRA_DATABASE_URL",
    f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH.as_posix()}",
)


@dataclass(frozen=True)
class TenantContext:
    user_id: str = "erik"
    org_id: str = "vectra-advisory"


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        DEFAULT_SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_async_engine(
            DATABASE_URL,
            echo=False,
            future=True,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _session_factory


async def init_db_schema() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def tenant_session(tenant: TenantContext | None = None) -> AsyncIterator[AsyncSession]:
    """Yield an AsyncSession scoped to the given tenant's RLS context."""
    ctx = tenant or TenantContext()
    factory = get_session_factory()
    async with factory() as session:
        if DATABASE_URL.startswith("postgresql"):
            await session.execute(
                text("SELECT set_config('app.current_user_id', :uid, true)"),
                {"uid": ctx.user_id},
            )
            await session.execute(
                text("SELECT set_config('app.current_org_id', :oid, true)"),
                {"oid": ctx.org_id},
            )
        yield session


def rls_visibility_filter(model: Any, tenant: TenantContext) -> ColumnElement[bool]:
    """Defense-in-depth SQLAlchemy predicate mirroring PostgreSQL RLS policy."""
    return or_(
        model.visibility == "global",
        and_(model.visibility == "org_private", model.owner_org_id == tenant.org_id),
        and_(model.visibility == "user_private", model.owner_user_id == tenant.user_id),
    )
