"""Multi-Industry Enterprise AI Intelligence Seed Orchestrator for VECTRA.

Imports domain fixtures from:
- `seed_nodes_core`: Core horizontal, infrastructure, MCP, regulatory & healthcare nodes/sources
- `seed_nodes_verticals`: Industrial, retail, legal, GraphRAG & foreign-tenant RLS test nodes/sources
- `seed_relations`: Encrypted KMS integrations, associative edges, and Obsidian `[[Wikilink]]` notes
"""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    AssociativeEdge,
    CanonicalNode,
    ConsultantNote,
    NodeSource,
    UserIntegration,
)
from .scoring import deterministic_embedding_1536, extract_wikilinks
from .seed_nodes_core import CORE_NODES_SEED, get_core_sources_seed
from .seed_nodes_verticals import VERTICAL_NODES_SEED, get_vertical_sources_seed
from .seed_relations import EDGES_SEED_DATA, NOTES_SEED_DATA, get_integrations_seed
from .vault import KMSEnvelopeVault


async def seed_database(session: AsyncSession) -> dict[str, int]:
    """Idempotently populate encrypted integrations, canonical nodes, citations, edges, and notes."""
    existing = await session.execute(select(CanonicalNode).limit(1))
    if existing.scalars().first() is not None:
        return {"seeded": 0}

    now = datetime.now(timezone.utc)
    vault = KMSEnvelopeVault()

    for spec in get_integrations_seed(now):
        env = vault.encrypt_payload(spec["payload"], aad_context=f"{spec['owner_user_id']}:{spec['provider']}")
        session.add(
            UserIntegration(
                owner_user_id=spec["owner_user_id"],
                owner_org_id=spec["owner_org_id"],
                provider=spec["provider"],
                account_handle=spec["account_handle"],
                encrypted_dek=env.encrypted_dek,
                encryption_iv=env.encryption_iv,
                ciphertext=env.ciphertext,
                auth_tag=env.auth_tag,
                scopes=spec["scopes"],
                status=spec["status"],
                metadata_json=spec["metadata_json"],
                expires_at=spec["expires_at"],
                last_synced_at=spec["last_synced_at"],
            )
        )

    nodes_data = [*CORE_NODES_SEED, *VERTICAL_NODES_SEED]
    for n in nodes_data:
        embed_text = (
            f"{n['title']} {n['summary_executive']} {n['summary_technical']} {' '.join(n['industry_verticals'])}"
        )
        session.add(
            CanonicalNode(
                id=n["id"],
                slug=n["slug"],
                title=n["title"],
                summary_executive=n["summary_executive"],
                summary_technical=n["summary_technical"],
                summary_contrarian=n["summary_contrarian"],
                claim_vendor=n["claim_vendor"],
                claim_builder=n["claim_builder"],
                claim_production=n["claim_production"],
                industry_verticals=n["industry_verticals"],
                maturity_stage=n["maturity_stage"],
                base_signal_score=n["base_signal_score"],
                consultant_weight=n["consultant_weight"],
                adoption_velocity=n["adoption_velocity"],
                verified_roi_score=n["verified_roi_score"],
                visibility=n["visibility"],
                owner_org_id=n["owner_org_id"],
                owner_user_id=n["owner_user_id"],
                embedding=deterministic_embedding_1536(embed_text),
            )
        )

    for s in [*get_core_sources_seed(now), *get_vertical_sources_seed(now)]:
        session.add(NodeSource(**s))

    for e in EDGES_SEED_DATA:
        session.add(AssociativeEdge(**e))

    for note in NOTES_SEED_DATA:
        links = extract_wikilinks(note["markdown_content"])
        session.add(
            ConsultantNote(
                node_id=note["node_id"],
                owner_user_id=note["owner_user_id"],
                owner_org_id=note["owner_org_id"],
                visibility=note["visibility"],
                markdown_content=note["markdown_content"],
                extracted_wikilinks=links,
            )
        )

    await session.commit()
    return {"seeded": len(nodes_data)}
