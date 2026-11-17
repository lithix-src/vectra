"""Subgraph Co-Pilot RAG, Boardroom Session & Executive Deliverable Routes (`apps/api/routes_copilot_deliverables.py`)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter
from fastapi.responses import Response
from graph_service import build_rls_graph_payload
from llm_runtime import CopilotLLMGeneration, generate_local_rag_synthesis
from mcp_tools import mcp_gateway
from pptx_generator import build_subgraph_pptx
from schemas import (
    CopilotCitationRef,
    CopilotQueryRequest,
    CopilotStructuredResponse,
    CreatePresentationSessionRequest,
    ExportPptxRequest,
)
from vectra_db import TenantContext

router = APIRouter()
_PRESENTATION_SESSIONS: Dict[str, Dict[str, Any]] = {}


@router.post("/api/copilot/query", response_model=CopilotStructuredResponse)
async def query_subgraph_copilot(
    req: CopilotQueryRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> CopilotStructuredResponse:
    """Assemble RAG context strictly via the Zero-Trust MCP Gateway (zero direct model DB access)."""
    mcp_envelope = await mcp_gateway.build_rag_mcp_envelope(
        node_ids=req.node_ids,
        vertical=req.industry_vertical,
        tenant_user_id=tenant_user_id,
        tenant_org_id=tenant_org_id,
    )
    selected_nodes = mcp_envelope.payload["nodes"]
    selected_edges = mcp_envelope.payload["edges"]
    citations = [CopilotCitationRef(**c) for c in mcp_envelope.payload["citations"]]

    node_titles = ", ".join(n["title"] for n in selected_nodes)
    pub_count = sum(1 for c in citations if c.provenance_license == "public")
    sub_count = sum(1 for c in citations if c.provenance_license == "subscriber_licensed")

    lens_label = {
        "c_suite": "C-Suite ROI, Capital Allocation & Regulatory Exposure",
        "cto": "CTO Architecture, p99 Latency, KV-Cache & Data-Tier Topology",
        "contrarian": "Contrarian Skeptic — Failure Modes, Vendor Hype vs. Production Reality",
    }.get(req.variant_lens, "Executive Synthesis")

    primary_summaries = []
    for n in selected_nodes:
        if req.variant_lens == "cto":
            primary_summaries.append(f"• {n['title']}: {n['summary_technical']}")
        elif req.variant_lens == "contrarian":
            primary_summaries.append(f"• {n['title']}: {n['summary_contrarian']}")
        else:
            primary_summaries.append(f"• {n['title']}: {n['summary_executive']}")

    notes_included = [
        f"Erik's Note on '{note['node_title']}': {note['consultant_note']}"
        for note in mcp_envelope.payload["notes"]
    ]

    exec_answer = (
        f"[{lens_label}] Scoped strictly via Zero-Trust MCP Gateway ({', '.join(mcp_envelope.tools_invoked)}) "
        f"to your {len(selected_nodes)} lassoed canonical nodes ({node_titles}) "
        f"and {len(citations)} verified citations ({pub_count} [Public], {sub_count} [Subscriber Licensed]): "
        f"Regarding \"{req.question}\" — Enterprise production telemetry demonstrates that bounded, deterministic "
        f"architectures (Temporal DAGs + grammar-constrained local LLMs + consolidated PostgreSQL 17 pgvector/AGE with RLS) "
        f"deliver 48–64% verified cost/queue compression, whereas unconstrained multi-agent swarms and unproxied "
        f"desktop MCP tools fail audit and latency gates. "
        + (" ".join(primary_summaries[:2]))
        + (f" Incorporates {len(notes_included)} private consultant field note(s)." if notes_included else "")
    )

    fallback_gen = CopilotLLMGeneration(
        executive_answer=exec_answer,
        architectural_implications=[
            f"{n['title']} (Composite {n['composite_score']}): {n['summary_technical']}"
            for n in selected_nodes[:4]
        ],
        contrarian_risks=[
            f"{n['title']}: {n['summary_contrarian']}"
            for n in selected_nodes[:4]
        ],
        recommended_90_day_actions=[
            "Days 1–30: Enforce EU AI Act Annex IV & OCC SR 11-7 citation provenance gates; block unproxied stdio MCP servers.",
            "Days 31–60: Consolidate vector/graph retrieval onto PostgreSQL 17 (pgvector HNSW + Apache AGE) with tenant RLS isolation.",
            "Days 61–90: Deploy disaggregated prefill/decode vLLM / Ollama local serving and deterministic Temporal state machines.",
        ],
    )

    rag_result = await generate_local_rag_synthesis(
        question=req.question,
        variant_lens=req.variant_lens,
        lens_label=lens_label,
        selected_nodes=selected_nodes,
        selected_edges=selected_edges,
        citations_summary=[c.model_dump() for c in citations],
        notes_included=notes_included,
        fallback_generation=fallback_gen,
        mcp_envelope=mcp_envelope,
    )
    gen: CopilotLLMGeneration = rag_result["generation"]

    return CopilotStructuredResponse(
        executive_answer=gen.executive_answer,
        architectural_implications=gen.architectural_implications,
        contrarian_risks=gen.contrarian_risks,
        recommended_90_day_actions=gen.recommended_90_day_actions,
        citations_used=citations[:8],
        subgraph_node_count=len(selected_nodes),
        subgraph_edge_count=len(selected_edges),
        llm_provider=rag_result["llm_provider"],
        llm_model=rag_result["llm_model"],
        execution_mode=rag_result["execution_mode"],
        commercial_models_blocked=rag_result["commercial_models_blocked"],
        mcp_mediated=True,
        mcp_tools_invoked=mcp_envelope.tools_invoked,
        mcp_audit_ids=mcp_envelope.audit_ids,
        latency_ms=rag_result["latency_ms"],
    )


@router.post("/api/present/session")
async def create_presentation_session(
    req: CreatePresentationSessionRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    selected_set = set(req.node_ids)
    nodes = [n for n in graph["nodes"] if n["id"] in selected_set] if selected_set else graph["nodes"]
    node_ids_set = {n["id"] for n in nodes}
    edges = [
        e for e in graph["edges"] if e["source_node_id"] in node_ids_set and e["target_node_id"] in node_ids_set
    ]

    session_id = f"boardroom-{uuid.uuid4().hex[:8]}"
    payload = {
        "session_id": session_id,
        "title": req.title,
        "variant_lens": req.variant_lens,
        "industry_vertical": req.industry_vertical,
        "copilot_synthesis": req.copilot_synthesis,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
        "edges": edges,
    }
    _PRESENTATION_SESSIONS[session_id] = payload
    if len(_PRESENTATION_SESSIONS) > 128:
        oldest = next(iter(_PRESENTATION_SESSIONS))
        _PRESENTATION_SESSIONS.pop(oldest, None)
    return payload


@router.get("/api/present/{session_id}")
async def get_presentation_session(
    session_id: str,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    if session_id in _PRESENTATION_SESSIONS:
        return _PRESENTATION_SESSIONS[session_id]

    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    return {
        "session_id": session_id,
        "title": "VECTRA Executive Boardroom Briefing",
        "variant_lens": "c_suite",
        "industry_vertical": "All Verticals",
        "copilot_synthesis": (
            "Production AI value in 2026 concentrates in deterministic state-graph orchestration, "
            "disaggregated vLLM inference, and citation-locked domain workflows."
        ),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "nodes": graph["nodes"],
        "edges": graph["edges"],
    }


@router.post("/api/export/pptx")
async def export_pptx_deck(
    req: ExportPptxRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Response:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    selected_set = set(req.node_ids)
    nodes = [n for n in graph["nodes"] if n["id"] in selected_set] if selected_set else graph["nodes"][:5]
    node_ids_set = {n["id"] for n in nodes}
    edges = [
        e for e in graph["edges"] if e["source_node_id"] in node_ids_set and e["target_node_id"] in node_ids_set
    ]

    pptx_bytes = build_subgraph_pptx(
        deck_title=req.deck_title,
        variant_lens=req.variant_lens,
        industry_filter=req.industry_vertical,
        nodes=nodes,
        edges=edges,
        copilot_synthesis=req.copilot_synthesis,
    )
    filename = f"VECTRA_Executive_Readout_{req.variant_lens.upper()}.pptx"
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/api/export/brief")
async def export_executive_brief(
    req: ExportPptxRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Response:
    """Build a comprehensive Markdown Executive Advisory Memorandum (VECTRA_Executive_Brief.md)."""
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    graph = await build_rls_graph_payload(tenant=tenant, vertical="All Verticals")
    selected_set = set(req.node_ids)
    nodes = [n for n in graph["nodes"] if n["id"] in selected_set] if selected_set else graph["nodes"][:5]

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: List[str] = [
        f"# VECTRA Executive Advisory Memorandum — {req.deck_title}",
        "",
        f"- **Title**: {req.deck_title}",
        f"- **Variant Lens**: `{req.variant_lens.upper()}`",
        f"- **Industry Scope**: {req.industry_vertical}",
        f"- **Timestamp**: {now_iso}",
        f"- **Tenant RLS Scope**: `{tenant_user_id}@{tenant_org_id}` (`rls_active=True`)",
        "",
        "---",
        "",
        "## Section 1: Executive Thesis & Multi-Lens Synthesis",
        "",
    ]

    if req.copilot_synthesis:
        lines.extend([f"> **Co-Pilot Subgraph Synthesis**: {req.copilot_synthesis}", ""])

    for idx, n in enumerate(nodes, start=1):
        lines.extend(
            [
                f"### {idx}. {n['title']} (Composite Score: `{n['composite_score']}` | Stage: `{n['maturity_stage']}`)",
                f"- **C-Suite Executive Thesis**: {n['summary_executive']}",
                f"- **CTO Architectural Synthesis**: {n['summary_technical']}",
                f"- **Contrarian Skeptic Counterpoint**: {n['summary_contrarian']}",
            ]
        )
        if n.get("consultant_note"):
            lines.append(f"- **Erik's Private Field Note**: _{n['consultant_note']}_")
        lines.append("")

    lines.extend(
        [
            "---",
            "",
            "## Section 2: Variant Diff Matrix (Vendor Claim vs Builder Reality vs Audited Production Proof)",
            "",
            "| Canonical Node | Vendor Marketing Claim | Builder Engineering Reality | Audited Production Proof |",
            "| :--- | :--- | :--- | :--- |",
        ]
    )
    for n in nodes:
        v_claim = str(n.get("claim_vendor", "")).replace("|", "\\|")
        b_claim = str(n.get("claim_builder", "")).replace("|", "\\|")
        p_claim = str(n.get("claim_production", "")).replace("|", "\\|")
        lines.append(f"| **{n['title']}** | {v_claim} | {b_claim} | {p_claim} |")

    lines.extend(
        [
            "",
            "---",
            "",
            "## Section 3: Verified Primary Evidence Table",
            "",
            "| Node | Provenance | Source | Direct URL | Verbatim Quote |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ]
    )
    for n in nodes:
        for s in n.get("sources", []):
            prov_badge = (
                "[Subscriber Licensed]"
                if s.get("provenance_license") == "subscriber_licensed"
                else "[Public]"
            )
            quote_clean = str(s.get("exact_quote", "")).replace("|", "\\|").replace("\n", " ")
            src_name = str(s.get("source_name", "")).replace("|", "\\|")
            url = s.get("direct_url", "")
            lines.append(f"| {n['title']} | `{prov_badge}` | {src_name} | {url} | \"{quote_clean}\" |")

    lines.extend(
        [
            "",
            "---",
            "",
            "## Section 4: 90-Day Enterprise Execution Action Plan",
            "",
            "1. **Days 1–30 (Governance & Citation Provenance Gates)**: Enforce EU AI Act Annex IV & OCC SR 11-7 citation provenance gates across all executive readouts; block unproxied `stdio` MCP servers in favor of zero-trust OAuth 2.1 / mTLS gateways.",
            "2. **Days 31–60 (Data-Tier Consolidation & RLS Enforcement)**: Consolidate fragmented vector and graph stores onto PostgreSQL 17 (`pgvector` HNSW + Apache AGE OpenCypher) with strict per-tenant Row-Level Security (`RLS`).",
            "3. **Days 61–90 (Deterministic Orchestration & Disaggregated Inference)**: Transition multi-agent workflows onto deterministic Temporal state graphs backed by disaggregated prefill/decode `vLLM` clusters with grammar-constrained outputs.",
            "",
        ]
    )

    md_content = "\n".join(lines)
    return Response(
        content=md_content.encode("utf-8"),
        media_type="text/markdown",
        headers={
            "Content-Disposition": 'attachment; filename="VECTRA_Executive_Brief.md"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
