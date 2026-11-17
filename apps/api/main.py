"""VECTRA FastAPI Entrypoint — Modular REST, Local LLM, MCP Gateway & RLS Graph API (`apps/api/main.py`).

Composes domain routers & services:
- `schemas.py`: Pydantic v2 request/response schemas
- `graph_service.py`: Multi-tenant RLS graph assembly, openCypher builder, and `[[Wikilink]]` edge sync
- `mcp_tools.py` & `mcp_gateway.py`: Zero-Trust Model Context Protocol (MCP) JSON-RPC 2.0 Broker
- `llm_runtime.py` & `llm_policy.py`: Sovereign Local LLM & 1536-d Embeddings Engine (`0% Commercial Cloud`)
- `routes_ingest_auth.py`: KMS Credential Vault, X OAuth 2.0 PKCE, Webhooks & Collector Pack Scheduler
- `routes_copilot_deliverables.py`: Subgraph Co-Pilot RAG, Boardroom Sessions, `.pptx` & `.md` Exports
"""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[2]
for extra_path in (ROOT_DIR / "apps" / "api", ROOT_DIR / "packages" / "db", ROOT_DIR / "apps" / "workers"):
    path_str = str(extra_path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

from graph_service import (  # noqa: E402
    build_rls_graph_payload,
    build_safe_cypher_query,
    sync_consultant_note_and_wikilinks,
)
from llm_runtime import (  # noqa: E402
    CommercialModelPolicyError,
    LocalLLMConfig,
    embed_text_local_1536,
    get_active_llm_config,
    probe_local_llm_status,
    set_active_llm_config,
)
from mcp_gateway import (  # noqa: E402
    MCPGatewayPolicyConfig,
    MCPJsonRpcRequest,
    MCPPolicyViolationError,
    MCPServerDefinition,
)
from mcp_tools import mcp_gateway  # noqa: E402
from routes_copilot_deliverables import (  # noqa: E402
    create_presentation_session,
    export_executive_brief,
    export_pptx_deck,
    get_presentation_session,
    query_subgraph_copilot,
    router as copilot_deliverables_router,
)
from routes_ingest_auth import (  # noqa: E402
    get_collector_packs_endpoint,
    inbound_newsletter_webhook,
    ingest_custom_signal,
    list_user_integrations,
    refresh_integration_credentials,
    router as ingest_auth_router,
    run_public_enterprise_collectors,
    update_collector_schedule_endpoint,
    x_oauth2_pkce_callback,
    x_oauth2_pkce_connect,
)
from schemas import (  # noqa: E402
    CollectorScheduleUpdateRequest,
    CopilotCitationRef,
    CopilotQueryRequest,
    CopilotStructuredResponse,
    CreateEdgeRequest,
    CreatePresentationSessionRequest,
    CustomSignalIngestRequest,
    ExportPptxRequest,
    INDUSTRY_VERTICALS,
    InboundEmailWebhookRequest,
    LocalEmbedRequest,
    NoteUpdateRequest,
    WeightUpdateRequest,
)
from vectra_db import (  # noqa: E402
    AssociativeEdge,
    CanonicalNode,
    TenantContext,
    init_db_schema,
    rls_visibility_filter,
    seed_database,
    tenant_session,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_schema()
    async with tenant_session(TenantContext(user_id="erik", org_id="vectra-advisory")) as session:
        await seed_database(session)
    yield


app = FastAPI(
    title="VECTRA — Enterprise AI Intelligence & Advisory OS API",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    llm_cfg = get_active_llm_config()
    return {
        "status": "ok",
        "service": "vectra-api",
        "rls_enforced": True,
        "kms_cipher": "AES-256-GCM",
        "default_tenant": "erik@vectra-advisory",
        "llm_provider": llm_cfg.provider,
        "llm_model": llm_cfg.model,
        "embedding_model": llm_cfg.embedding_model,
        "commercial_models_blocked": llm_cfg.block_commercial_models,
    }


@app.get("/api/llm/status")
async def get_local_llm_runtime_status() -> Dict[str, Any]:
    """Probe the active Sovereign Local LLM & Embedding runtime."""
    return await probe_local_llm_status()


@app.post("/api/llm/config")
async def update_local_llm_runtime_config(req: LocalLLMConfig) -> Dict[str, Any]:
    """Update active local LLM provider/model while blocking commercial cloud endpoints."""
    try:
        updated = set_active_llm_config(req)
    except CommercialModelPolicyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await probe_local_llm_status(updated)


@app.post("/api/llm/embed")
async def create_local_embedding(req: LocalEmbedRequest) -> Dict[str, Any]:
    """Compute a 1536-d vector embedding using the configured local embedding model."""
    return await embed_text_local_1536(req.text)


@app.get("/api/mcp/status")
async def get_mcp_gateway_status() -> Dict[str, Any]:
    """Return Zero-Trust MCP Gateway policy, registered MCP servers/tools, and immutable audit log."""
    return mcp_gateway.get_status()


@app.post("/api/mcp/policy")
async def update_mcp_gateway_policy(req: MCPGatewayPolicyConfig) -> Dict[str, Any]:
    """Update Zero-Trust MCP Gateway policy (rejects enabling unproxied stdio or direct DB access)."""
    try:
        mcp_gateway.update_policy(req)
    except MCPPolicyViolationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return mcp_gateway.get_status()


@app.post("/api/mcp/servers")
async def register_mcp_server(req: MCPServerDefinition) -> Dict[str, Any]:
    """Register or update an MCP server definition (blocks unproxied stdio transport)."""
    try:
        mcp_gateway.register_or_update_server(req)
    except MCPPolicyViolationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return mcp_gateway.get_status()


@app.post("/api/mcp/rpc")
async def handle_mcp_jsonrpc_endpoint(
    req: MCPJsonRpcRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    """Execute a Zero-Trust Model Context Protocol (MCP) JSON-RPC 2.0 request."""
    try:
        return await mcp_gateway.handle_jsonrpc(
            req,
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )
    except MCPPolicyViolationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@app.get("/api/graph")
async def get_graph(
    vertical: str = "All Verticals",
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    return await build_rls_graph_payload(tenant=tenant, vertical=vertical)


@app.get("/api/graph/cypher")
async def get_apache_age_cypher_query(
    vertical: str = "All Verticals",
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    """Return the equivalent Apache AGE openCypher query for the active RLS-scoped subgraph."""
    return build_safe_cypher_query(
        vertical=vertical,
        tenant_user_id=tenant_user_id,
        tenant_org_id=tenant_org_id,
    )


@app.patch("/api/nodes/{node_id}/weight")
async def update_node_weight(
    node_id: str,
    req: WeightUpdateRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    async with tenant_session(tenant) as session:
        stmt = select(CanonicalNode).where(
            CanonicalNode.id == node_id,
            rls_visibility_filter(CanonicalNode, tenant),
        )
        node = (await session.execute(stmt)).scalars().first()
        if not node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found in tenant RLS view")

        node.consultant_weight = round(float(req.consultant_weight), 2)
        await session.commit()

    graph = await build_rls_graph_payload(tenant=tenant)
    updated_node = next((n for n in graph["nodes"] if n["id"] == node_id), None)
    return {"status": "updated", "node": updated_node}


@app.post("/api/edges")
async def create_manual_edge(
    req: CreateEdgeRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    if req.source_node_id == req.target_node_id:
        raise HTTPException(status_code=400, detail="Self-loop edges are not permitted")

    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    async with tenant_session(tenant) as session:
        existing_stmt = select(AssociativeEdge).where(
            AssociativeEdge.source_node_id == req.source_node_id,
            AssociativeEdge.target_node_id == req.target_node_id,
            AssociativeEdge.relation_type == req.relation_type,
            rls_visibility_filter(AssociativeEdge, tenant),
        )
        edge = (await session.execute(existing_stmt)).scalars().first()
        if edge:
            edge.weight = req.weight
            edge.is_user_created = True
            edge.consultant_note = req.consultant_note or edge.consultant_note
        else:
            edge = AssociativeEdge(
                source_node_id=req.source_node_id,
                target_node_id=req.target_node_id,
                relation_type=req.relation_type,
                weight=req.weight,
                is_user_created=True,
                consultant_note=req.consultant_note or "Created interactively by Erik on canvas",
                visibility="user_private",
                owner_org_id=tenant.org_id,
                owner_user_id=tenant.user_id,
            )
            session.add(edge)
        await session.commit()
        return {
            "status": "upserted",
            "edge": {
                "id": edge.id,
                "source": edge.source_node_id,
                "target": edge.target_node_id,
                "source_node_id": edge.source_node_id,
                "target_node_id": edge.target_node_id,
                "relation_type": edge.relation_type,
                "weight": edge.weight,
                "is_user_created": edge.is_user_created,
                "consultant_note": edge.consultant_note,
            },
        }


@app.put("/api/nodes/{node_id}/note")
async def save_consultant_note_and_sync_wikilinks(
    node_id: str,
    req: NoteUpdateRequest,
    tenant_user_id: str = "erik",
    tenant_org_id: str = "vectra-advisory",
) -> Dict[str, Any]:
    """Save per-node Markdown note, extract `[[wikilinks]]`, and auto-upsert `associative_edges`."""
    tenant = TenantContext(user_id=tenant_user_id, org_id=tenant_org_id)
    return await sync_consultant_note_and_wikilinks(node_id=node_id, req=req, tenant=tenant)


app.include_router(ingest_auth_router)
app.include_router(copilot_deliverables_router)

__all__ = [
    "CollectorScheduleUpdateRequest",
    "CopilotCitationRef",
    "CopilotQueryRequest",
    "CopilotStructuredResponse",
    "CreateEdgeRequest",
    "CreatePresentationSessionRequest",
    "CustomSignalIngestRequest",
    "ExportPptxRequest",
    "INDUSTRY_VERTICALS",
    "InboundEmailWebhookRequest",
    "LocalEmbedRequest",
    "NoteUpdateRequest",
    "WeightUpdateRequest",
    "app",
    "create_local_embedding",
    "create_manual_edge",
    "create_presentation_session",
    "export_executive_brief",
    "export_pptx_deck",
    "get_apache_age_cypher_query",
    "get_collector_packs_endpoint",
    "get_graph",
    "get_local_llm_runtime_status",
    "get_mcp_gateway_status",
    "get_presentation_session",
    "handle_mcp_jsonrpc_endpoint",
    "inbound_newsletter_webhook",
    "ingest_custom_signal",
    "list_user_integrations",
    "query_subgraph_copilot",
    "refresh_integration_credentials",
    "register_mcp_server",
    "run_public_enterprise_collectors",
    "save_consultant_note_and_sync_wikilinks",
    "update_collector_schedule_endpoint",
    "update_local_llm_runtime_config",
    "update_mcp_gateway_policy",
    "update_node_weight",
    "x_oauth2_pkce_callback",
    "x_oauth2_pkce_connect",
]
