"""Scheduled & Ad-Hoc Worker Tasks for VECTRA (`apps/workers/tasks.py`).

Re-exports Temporal workflows and activities from `worker.py` and provides
convenience entrypoints for public enterprise RSS/EDGAR/NIST collector scheduling.
"""
from __future__ import annotations

from typing import Any, Dict

from worker import (
    IngestItemPayload,
    MultiTierIngestionWorkflow,
    cluster_and_attach_source_activity,
    collect_public_enterprise_feeds_activity,
    refresh_x_oauth2_tokens_activity,
)


async def run_scheduled_collectors(
    collector_tier: str = "all",
    owner_user_id: str = "erik",
) -> Dict[str, Any]:
    """Execute scheduled public enterprise & regulatory feed ingestion (F500 CapEx, SEC 8-K, NIST AI RMF)."""
    return await collect_public_enterprise_feeds_activity(
        collector_tier=collector_tier,
        owner_user_id=owner_user_id,
    )


__all__ = [
    "IngestItemPayload",
    "MultiTierIngestionWorkflow",
    "cluster_and_attach_source_activity",
    "collect_public_enterprise_feeds_activity",
    "refresh_x_oauth2_tokens_activity",
    "run_scheduled_collectors",
]
