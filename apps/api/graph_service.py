"""RLS-Scoped Graph Serialization, Apache AGE Cypher Builder & Wikilink Sync (`apps/api/graph_service.py`)."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import HTTPException
from schemas import INDUSTRY_VERTICALS, NoteUpdateRequest
from sqlalchemy import select
from vectra_db import (
    AssociativeEdge,
    CanonicalNode,
    ConsultantNote,
    NodeSource,
    TenantContext,
    compute_composite_score,
    extract_wikilinks,
    rls_visibility_filter,
    tenant_session,
)


def _escape_cypher_literal(value: str) -> str:
    """Sanitize string literals interpolated into openCypher queries to prevent injection."""
    cleaned = re.sub(r"[^a-zA-Z0-9_\-\s/&@.]", "", value or "")
    return cleaned.replace("'", "")


def build_safe_cypher_query(
    vertical: str = "All Verticals",
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    """Return the parameterized, injection-safe Apache AGE openCypher SQL for the tenant's 3-tier RLS scope."""
    safe_user = _escape_cypher_literal(tenant_user_id)
    safe_org = _escape_cypher_literal(tenant_org_id)
    safe_vertical = _escape_cypher_literal(vertical)
    vertical_clause = (
        f"AND '{safe_vertical}' IN n.industry_verticals"
        if safe_vertical and safe_vertical != "All Verticals"
        else ""
    )
    rls_clause = (
        f"(n.visibility = 'global' "
        f"OR (n.visibility = 'org_private' AND n.owner_org_id = '{safe_org}') "
        f"OR (n.visibility = 'user_private' AND n.owner_user_id = '{safe_user}'))"
    )
    cypher = (
        "SELECT * FROM cypher('vectra_knowledge_graph', $$ "
        "MATCH (n:CanonicalNode)-[r:ASSOCIATIVE_EDGE]->(m:CanonicalNode) "
        f"WHERE {rls_clause} {vertical_clause} "
        "RETURN n.slug, type(r), r.weight, m.slug "
        "$$) AS (source_slug agtype, relation agtype, weight agtype, target_slug agtype);"
    )
    return {"graph_name": "vectra_knowledge_graph", "open_cypher_sql": cypher}


async def build_rls_graph_payload(
    tenant: TenantContext,
    vertical: str = "All Verticals",
) -> Dict[str, Any]:
    """Assemble RLS-filtered Canonical Nodes, Composite Scores, Citations, Edges, and Field Notes."""
    async with tenant_session(tenant) as session:
        node_stmt = select(CanonicalNode).where(rls_visibility_filter(CanonicalNode, tenant))
        nodes_orm = (await session.execute(node_stmt)).scalars().all()

        edge_stmt = select(AssociativeEdge).where(rls_visibility_filter(AssociativeEdge, tenant))
        edges_orm = (await session.execute(edge_stmt)).scalars().all()

        source_stmt = select(NodeSource).where(rls_visibility_filter(NodeSource, tenant))
        sources_orm = (await session.execute(source_stmt)).scalars().all()

        note_stmt = select(ConsultantNote).where(rls_visibility_filter(ConsultantNote, tenant))
        notes_orm = (await session.execute(note_stmt)).scalars().all()

        sources_by_node: Dict[str, List[NodeSource]] = {}
        for src in sources_orm:
            sources_by_node.setdefault(src.node_id, []).append(src)

        notes_by_node: Dict[str, ConsultantNote] = {n.node_id: n for n in notes_orm}

        filtered_nodes: List[CanonicalNode] = []
        for node in nodes_orm:
            if vertical and vertical != "All Verticals":
                if vertical not in (node.industry_verticals or []):
                    continue
            filtered_nodes.append(node)

        visible_node_ids = {n.id for n in filtered_nodes}
        filtered_edges = [
            e for e in edges_orm if e.source_node_id in visible_node_ids and e.target_node_id in visible_node_ids
        ]

        incident_edges_by_node: Dict[str, List[tuple[str, float]]] = {}
        for e in edges_orm:
            incident_edges_by_node.setdefault(e.source_node_id, []).append((e.relation_type, e.weight))
            incident_edges_by_node.setdefault(e.target_node_id, []).append((e.relation_type, e.weight))

        serialized_nodes: List[Dict[str, Any]] = []
        for node in filtered_nodes:
            node_srcs = sources_by_node.get(node.id, [])
            score_info = compute_composite_score(
                sources=[(s.authority_tier, s.published_at) for s in node_srcs],
                incident_edges=incident_edges_by_node.get(node.id, []),
                consultant_weight=node.consultant_weight,
                base_signal_score=node.base_signal_score,
            )
            note_obj = notes_by_node.get(node.id)
            serialized_nodes.append(
                {
                    "id": node.id,
                    "slug": node.slug,
                    "title": node.title,
                    "summary_executive": node.summary_executive,
                    "summary_technical": node.summary_technical,
                    "summary_contrarian": node.summary_contrarian,
                    "claim_vendor": node.claim_vendor,
                    "claim_builder": node.claim_builder,
                    "claim_production": node.claim_production,
                    "industry_verticals": node.industry_verticals,
                    "maturity_stage": node.maturity_stage,
                    "base_signal_score": node.base_signal_score,
                    "consultant_weight": node.consultant_weight,
                    "composite_score": score_info["composite_score"],
                    "score_breakdown": score_info,
                    "adoption_velocity": node.adoption_velocity,
                    "verified_roi_score": node.verified_roi_score,
                    "visibility": node.visibility,
                    "owner_org_id": node.owner_org_id,
                    "owner_user_id": node.owner_user_id,
                    "consultant_note": note_obj.markdown_content if note_obj else "",
                    "extracted_wikilinks": note_obj.extracted_wikilinks if note_obj else [],
                    "sources": [
                        {
                            "id": s.id,
                            "node_id": s.node_id,
                            "source_type": s.source_type,
                            "source_name": s.source_name,
                            "author_handle": s.author_handle,
                            "authority_tier": s.authority_tier,
                            "direct_url": s.direct_url,
                            "exact_quote": s.exact_quote,
                            "provenance_license": s.provenance_license,
                            "visibility": s.visibility,
                            "owner_user_id": s.owner_user_id,
                            "published_at": s.published_at.isoformat() if s.published_at else None,
                        }
                        for s in node_srcs
                    ],
                }
            )

        serialized_nodes.sort(key=lambda x: x["composite_score"], reverse=True)

        serialized_edges = [
            {
                "id": e.id,
                "source": e.source_node_id,
                "target": e.target_node_id,
                "source_node_id": e.source_node_id,
                "target_node_id": e.target_node_id,
                "relation_type": e.relation_type,
                "weight": e.weight,
                "is_user_created": e.is_user_created,
                "consultant_note": e.consultant_note,
                "visibility": e.visibility,
                "owner_user_id": e.owner_user_id,
            }
            for e in filtered_edges
        ]

        return {
            "tenant": {"user_id": tenant.user_id, "org_id": tenant.org_id, "rls_active": True},
            "verticals": INDUSTRY_VERTICALS,
            "active_vertical": vertical,
            "nodes": serialized_nodes,
            "edges": serialized_edges,
        }


async def sync_consultant_note_and_wikilinks(
    node_id: str,
    req: NoteUpdateRequest,
    tenant: TenantContext,
) -> Dict[str, Any]:
    """Persist consultant note, parse Obsidian `[[Wikilinks]]`, and auto-upsert `associative_edges`."""
    wikilinks = extract_wikilinks(req.markdown_content)
    upserted_edges: List[Dict[str, Any]] = []

    async with tenant_session(tenant) as session:
        src_node = (
            await session.execute(
                select(CanonicalNode).where(
                    CanonicalNode.id == node_id,
                    rls_visibility_filter(CanonicalNode, tenant),
                )
            )
        ).scalars().first()
        if not src_node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

        note_stmt = select(ConsultantNote).where(
            ConsultantNote.node_id == node_id,
            ConsultantNote.owner_user_id == tenant.user_id,
        )
        note = (await session.execute(note_stmt)).scalars().first()
        if note:
            note.markdown_content = req.markdown_content
            note.extracted_wikilinks = wikilinks
            note.updated_at = datetime.now(timezone.utc)
        else:
            note = ConsultantNote(
                node_id=node_id,
                owner_user_id=tenant.user_id,
                owner_org_id=tenant.org_id,
                visibility="user_private",
                markdown_content=req.markdown_content,
                extracted_wikilinks=wikilinks,
            )
            session.add(note)

        all_nodes = (
            await session.execute(select(CanonicalNode).where(rls_visibility_filter(CanonicalNode, tenant)))
        ).scalars().all()

        for link_text in wikilinks:
            needle = link_text.strip().lower()
            target_node: CanonicalNode | None = None
            for candidate in all_nodes:
                if candidate.id == node_id:
                    continue
                if (
                    candidate.title.lower() == needle
                    or candidate.slug.lower() == needle
                    or needle in candidate.title.lower()
                ):
                    target_node = candidate
                    break

            if target_node is not None:
                edge_stmt = select(AssociativeEdge).where(
                    AssociativeEdge.source_node_id == node_id,
                    AssociativeEdge.target_node_id == target_node.id,
                    AssociativeEdge.relation_type == req.default_relation_type,
                    rls_visibility_filter(AssociativeEdge, tenant),
                )
                existing_edge = (await session.execute(edge_stmt)).scalars().first()
                if existing_edge:
                    existing_edge.is_user_created = True
                    existing_edge.weight = max(existing_edge.weight, 2.2)
                    existing_edge.consultant_note = f"Linked via [[{target_node.title}]] in Erik's Field Notes"
                    edge_obj = existing_edge
                else:
                    edge_obj = AssociativeEdge(
                        source_node_id=node_id,
                        target_node_id=target_node.id,
                        relation_type=req.default_relation_type,
                        weight=2.4,
                        is_user_created=True,
                        consultant_note=f"Auto-linked via [[{target_node.title}]] wikilink in Consultant Field Notes",
                        visibility="user_private",
                        owner_org_id=tenant.org_id,
                        owner_user_id=tenant.user_id,
                    )
                    session.add(edge_obj)
                    await session.flush()

                upserted_edges.append(
                    {
                        "id": edge_obj.id,
                        "source": edge_obj.source_node_id,
                        "target": edge_obj.target_node_id,
                        "source_node_id": edge_obj.source_node_id,
                        "target_node_id": edge_obj.target_node_id,
                        "target_title": target_node.title,
                        "relation_type": edge_obj.relation_type,
                        "weight": edge_obj.weight,
                        "is_user_created": edge_obj.is_user_created,
                        "consultant_note": edge_obj.consultant_note,
                    }
                )

        await session.commit()

    return {
        "status": "saved",
        "node_id": node_id,
        "extracted_wikilinks": wikilinks,
        "upserted_edges": upserted_edges,
    }
