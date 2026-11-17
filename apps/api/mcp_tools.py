"""Zero-Trust MCP Tool Handlers Bound to `MCPZeroTrustGateway` (`apps/api/mcp_tools.py`)."""
from __future__ import annotations

from typing import Any, Dict, List

from graph_service import build_rls_graph_payload, build_safe_cypher_query
from llm_runtime import embed_text_local_1536
from mcp_gateway import MCPZeroTrustGateway
from tasks import get_collector_schedule_status, run_collector_pack
from vectra_db import TenantContext, extract_wikilinks

mcp_gateway = MCPZeroTrustGateway()


async def _mcp_tool_get_rls_subgraph(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    vertical = str(arguments.get("vertical") or "All Verticals")
    graph = await build_rls_graph_payload(tenant=tenant, vertical=vertical)
    req_ids = set(arguments.get("node_ids") or [])
    nodes = [n for n in graph["nodes"] if n["id"] in req_ids] if req_ids else graph["nodes"][:4]
    node_set = {n["id"] for n in nodes}
    edges = [
        e for e in graph["edges"] if e["source_node_id"] in node_set and e["target_node_id"] in node_set
    ]
    return {"nodes": nodes, "edges": edges}


async def _mcp_tool_get_verified_citations(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    req_ids = set(arguments.get("node_ids") or [])
    nodes = [n for n in graph["nodes"] if n["id"] in req_ids] if req_ids else graph["nodes"][:4]
    citations: List[Dict[str, Any]] = []
    for n in nodes:
        for s in n.get("sources", []):
            citations.append(
                {
                    "source_id": s["id"],
                    "node_title": n["title"],
                    "source_name": s["source_name"],
                    "direct_url": s["direct_url"],
                    "provenance_license": s["provenance_license"],
                    "exact_quote": s["exact_quote"],
                }
            )
    return {"citations": citations}


async def _mcp_tool_get_consultant_notes(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    req_ids = set(arguments.get("node_ids") or [])
    nodes = [n for n in graph["nodes"] if n["id"] in req_ids] if req_ids else graph["nodes"][:4]
    notes = [
        {"node_id": n["id"], "node_title": n["title"], "consultant_note": n["consultant_note"]}
        for n in nodes
        if n.get("consultant_note")
    ]
    return {"notes": notes}


async def _mcp_tool_inspect_cypher(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    vertical = str(arguments.get("vertical") or "All Verticals")
    return build_safe_cypher_query(
        vertical=vertical,
        tenant_user_id=tenant_user_id,
        tenant_org_id=tenant_org_id,
    )


async def _mcp_tool_compute_embedding(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    return await embed_text_local_1536(str(arguments.get("text") or ""))


async def _mcp_tool_preview_wikilink_edges(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    md = str(arguments.get("markdown_content") or "")
    links = extract_wikilinks(md)
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    resolved_targets: List[Dict[str, str]] = []
    for link_text in links:
        needle = link_text.strip().lower()
        for n in graph["nodes"]:
            if n["title"].lower() == needle or n["slug"].lower() == needle or needle in n["title"].lower():
                resolved_targets.append(
                    {"wikilink": link_text, "target_node_id": n["id"], "target_title": n["title"]}
                )
                break
    return {
        "extracted_wikilinks": links,
        "resolved_targets": resolved_targets,
        "preview_edge_count": len(resolved_targets),
    }


async def _mcp_tool_list_curated_packs(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    return get_collector_schedule_status()


async def _mcp_tool_run_collector_pack(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    pack_id = str(arguments.get("pack_id") or "all")
    allow_live_http = bool(arguments.get("allow_live_http", False))
    return await run_collector_pack(
        pack_id=pack_id,
        owner_user_id=tenant_user_id,
        owner_org_id=tenant_org_id,
        allow_live_http=allow_live_http,
    )


async def _mcp_tool_prepare_deliverable_manifest(
    *, arguments: Dict[str, Any], tenant_user_id: str, tenant_org_id: str
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    req_ids = set(arguments.get("node_ids") or [])
    nodes = [n for n in graph["nodes"] if n["id"] in req_ids] if req_ids else graph["nodes"][:3]
    lens = str(arguments.get("variant_lens") or "c_suite")
    pub_citations = sum(
        1 for n in nodes for s in n.get("sources", []) if s.get("provenance_license") == "public"
    )
    sub_citations = sum(
        1 for n in nodes for s in n.get("sources", []) if s.get("provenance_license") == "subscriber_licensed"
    )
    return {
        "deliverables": ["VECTRA_Executive_Readout.pptx", "VECTRA_Executive_Brief.md"],
        "node_ids": [n["id"] for n in nodes],
        "node_titles": [n["title"] for n in nodes],
        "variant_lens": lens,
        "citation_counts": {"public": pub_citations, "subscriber_licensed": sub_citations},
        "rls_verified": True,
    }


mcp_gateway.register_tool_handler("vectra_get_rls_subgraph", _mcp_tool_get_rls_subgraph)
mcp_gateway.register_tool_handler("vectra_get_verified_citations", _mcp_tool_get_verified_citations)
mcp_gateway.register_tool_handler("vectra_get_consultant_notes", _mcp_tool_get_consultant_notes)
mcp_gateway.register_tool_handler("vectra_preview_wikilink_edges", _mcp_tool_preview_wikilink_edges)
mcp_gateway.register_tool_handler("vectra_inspect_cypher", _mcp_tool_inspect_cypher)
mcp_gateway.register_tool_handler("vectra_compute_local_embedding", _mcp_tool_compute_embedding)
mcp_gateway.register_tool_handler("vectra_list_curated_packs", _mcp_tool_list_curated_packs)
mcp_gateway.register_tool_handler("vectra_run_collector_pack", _mcp_tool_run_collector_pack)
mcp_gateway.register_tool_handler("vectra_prepare_deliverable_manifest", _mcp_tool_prepare_deliverable_manifest)
