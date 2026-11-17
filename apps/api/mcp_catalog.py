"""Zero-Trust MCP Schemas, Server/Tool Catalog, HMAC Envelope Signing & Output Scrubbing (`apps/api/mcp_catalog.py`)."""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import uuid
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field

MCPTransportType = Literal["mcp_http_sse", "mcp_internal_broker", "stdio_unproxied"]

FORBIDDEN_MCP_TARGETS = {
    "user_integrations",
    "tenant_integrations",
    "encrypted_dek",
    "ciphertext",
    "auth_tag",
    "kms_key_id",
    "kms_master_key",
    "vectra_kms_master_key",
    "raw_sql",
    "shell_exec",
    "os_system",
}

SECRET_REDACTION_REGEX = re.compile(
    r"(x_pkce_at_[a-zA-Z0-9_]+|sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{16,}|Bearer\s+[a-zA-Z0-9_\-\.]+|AES256GCM:[a-zA-Z0-9+/=_\-\.:]+)",
    re.IGNORECASE,
)


class MCPGatewaySecurityError(PermissionError):
    """Raised when an MCP request or unmediated LLM call violates Zero-Trust MCP Gateway security policy."""


class MCPPolicyViolationError(MCPGatewaySecurityError):
    """Raised when an MCP request or unmediated LLM call violates Zero-Trust MCP Gateway policy."""


class MCPServerDefinition(BaseModel):
    server_id: str
    name: str
    transport: MCPTransportType = "mcp_internal_broker"
    endpoint_url: str
    enabled: bool = True
    allowed_scopes: List[str] = Field(default_factory=list)
    allowed_tools: List[str] = Field(default_factory=list)
    description: str = ""


class MCPGatewayPolicyConfig(BaseModel):
    enforce_mcp_mediation: bool = True
    block_direct_model_db_access: bool = True
    allow_unproxied_stdio: bool = False
    redact_secrets_and_kms: bool = True
    require_tenant_rls_binding: bool = True
    active_scopes: List[str] = Field(
        default_factory=lambda: [
            "graph:read",
            "citations:read",
            "notes:read",
            "cypher:read",
            "embeddings:compute",
        ]
    )


class MCPAuditLogEntry(BaseModel):
    audit_id: str
    timestamp: str
    tenant_user_id: str
    tenant_org_id: str
    server_id: str
    jsonrpc_method: str
    tool_or_resource: str
    decision: Literal["ALLOWED", "DENIED"]
    reason: str
    latency_ms: float


class MCPMediatedEnvelope(BaseModel):
    """Cryptographically verified proof that LLM context was assembled exclusively via configured MCP tools."""

    envelope_id: str
    mcp_session_id: str
    tenant_user_id: str
    tenant_org_id: str
    tools_invoked: List[str]
    resources_read: List[str]
    audit_ids: List[str]
    direct_db_access_blocked: bool = True
    kms_secrets_redacted: bool = True
    signature_hmac: str
    payload: Dict[str, Any]


class MCPJsonRpcRequest(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int = Field(default_factory=lambda: f"mcp-{uuid.uuid4().hex[:8]}")
    method: Literal[
        "initialize",
        "tools/list",
        "tools/call",
        "resources/list",
        "resources/read",
        "prompts/list",
    ]
    params: Dict[str, Any] = Field(default_factory=dict)


DEFAULT_MCP_SERVERS: Dict[str, MCPServerDefinition] = {
    "vectra-graph-mcp": MCPServerDefinition(
        server_id="vectra-graph-mcp",
        name="VECTRA Canonical Knowledge Graph MCP Server",
        transport="mcp_internal_broker",
        endpoint_url="mcp://vectra-graph-mcp/v1",
        enabled=True,
        allowed_scopes=["graph:read", "cypher:read"],
        allowed_tools=["vectra_get_rls_subgraph", "vectra_inspect_cypher"],
        description="RLS-scoped access to Canonical Nodes, Composite Scores, and Apache AGE OpenCypher queries.",
    ),
    "vectra-citations-mcp": MCPServerDefinition(
        server_id="vectra-citations-mcp",
        name="VECTRA Primary Evidence & Citations MCP Server",
        transport="mcp_internal_broker",
        endpoint_url="mcp://vectra-citations-mcp/v1",
        enabled=True,
        allowed_scopes=["citations:read"],
        allowed_tools=["vectra_get_verified_citations"],
        description="RLS-scoped retrieval of [Public] and [Subscriber Licensed] primary quotes with provenance tags.",
    ),
    "vectra-notes-mcp": MCPServerDefinition(
        server_id="vectra-notes-mcp",
        name="VECTRA Consultant Field Notes & [[Wikilinks]] MCP Server",
        transport="mcp_internal_broker",
        endpoint_url="mcp://vectra-notes-mcp/v1",
        enabled=True,
        allowed_scopes=["notes:read"],
        allowed_tools=["vectra_get_consultant_notes", "vectra_preview_wikilink_edges"],
        description="Tenant-isolated access to consultant Markdown field notes and extracted [[Wikilink]] edges.",
    ),
    "vectra-embeddings-mcp": MCPServerDefinition(
        server_id="vectra-embeddings-mcp",
        name="VECTRA Local 1536-d Vector Embeddings, Public Intel & Deliverables MCP Server",
        transport="mcp_internal_broker",
        endpoint_url="mcp://vectra-embeddings-mcp/v1",
        enabled=True,
        allowed_scopes=["embeddings:compute", "graph:read"],
        allowed_tools=[
            "vectra_compute_local_embedding",
            "vectra_list_curated_packs",
            "vectra_run_collector_pack",
            "vectra_prepare_deliverable_manifest",
        ],
        description="Sovereign local embedding computation (1536-d), curated intel packs, and deliverable manifests.",
    ),
}

MCP_TOOLS_CATALOG: List[Dict[str, Any]] = [
    {
        "name": "vectra_get_rls_subgraph",
        "server_id": "vectra-graph-mcp",
        "required_scope": "graph:read",
        "description": "Fetch RLS-filtered Canonical Nodes and incident Associative Edges for a given subgraph selection.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_ids": {"type": "array", "items": {"type": "string"}},
                "vertical": {"type": "string", "default": "All Verticals"},
            },
            "required": [],
        },
    },
    {
        "name": "vectra_get_verified_citations",
        "server_id": "vectra-citations-mcp",
        "required_scope": "citations:read",
        "description": "Retrieve RLS-filtered verbatim primary source quotes and provenance licenses for selected nodes.",
        "inputSchema": {
            "type": "object",
            "properties": {"node_ids": {"type": "array", "items": {"type": "string"}}},
            "required": ["node_ids"],
        },
    },
    {
        "name": "vectra_get_consultant_notes",
        "server_id": "vectra-notes-mcp",
        "required_scope": "notes:read",
        "description": "Retrieve tenant-private Obsidian [[Wikilink]] field notes for selected Canonical Nodes.",
        "inputSchema": {
            "type": "object",
            "properties": {"node_ids": {"type": "array", "items": {"type": "string"}}},
            "required": ["node_ids"],
        },
    },
    {
        "name": "vectra_preview_wikilink_edges",
        "server_id": "vectra-notes-mcp",
        "required_scope": "notes:read",
        "description": "Extract and preview Obsidian [[Wikilink]] associative edges from consultant Markdown notes.",
        "inputSchema": {
            "type": "object",
            "properties": {"markdown_content": {"type": "string", "default": ""}},
            "required": [],
        },
    },
    {
        "name": "vectra_inspect_cypher",
        "server_id": "vectra-graph-mcp",
        "required_scope": "cypher:read",
        "description": "Return the parameterized Apache AGE OpenCypher query for the tenant's RLS-scoped graph.",
        "inputSchema": {
            "type": "object",
            "properties": {"vertical": {"type": "string", "default": "All Verticals"}},
            "required": [],
        },
    },
    {
        "name": "vectra_compute_local_embedding",
        "server_id": "vectra-embeddings-mcp",
        "required_scope": "embeddings:compute",
        "description": "Compute a 1536-d semantic embedding vector using the configured Sovereign Local LLM runtime.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "vectra_list_curated_packs",
        "server_id": "vectra-embeddings-mcp",
        "required_scope": "graph:read",
        "description": "List curated Public Enterprise Intelligence collector packs and worker schedules.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "vectra_run_collector_pack",
        "server_id": "vectra-embeddings-mcp",
        "required_scope": "graph:read",
        "description": "Trigger a curated or live RSS/SEC EDGAR/NIST collector pack via the Zero-Trust MCP Gateway.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pack_id": {"type": "string", "default": "all"},
                "allow_live_http": {"type": "boolean", "default": False},
            },
            "required": [],
        },
    },
    {
        "name": "vectra_prepare_deliverable_manifest",
        "server_id": "vectra-embeddings-mcp",
        "required_scope": "graph:read",
        "description": "Prepare a deliverable manifest for Executive .pptx and .md Advisory Brief generation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "node_ids": {"type": "array", "items": {"type": "string"}},
                "variant_lens": {"type": "string", "default": "c_suite"},
            },
            "required": [],
        },
    },
]

MCP_RESOURCES_CATALOG: List[Dict[str, Any]] = [
    {
        "uri": "mcp://vectra-graph-mcp/subgraph",
        "name": "RLS-Scoped Canonical Knowledge Subgraph",
        "server_id": "vectra-graph-mcp",
        "mimeType": "application/json",
        "required_scope": "graph:read",
    },
    {
        "uri": "mcp://vectra-citations-mcp/sources",
        "name": "Verified Primary Source Citations ([Public] & [Subscriber Licensed])",
        "server_id": "vectra-citations-mcp",
        "mimeType": "application/json",
        "required_scope": "citations:read",
    },
    {
        "uri": "mcp://vectra-notes-mcp/field-notes",
        "name": "Tenant-Private Consultant Field Notes & [[Wikilinks]]",
        "server_id": "vectra-notes-mcp",
        "mimeType": "application/json",
        "required_scope": "notes:read",
    },
]


def _signing_secret() -> bytes:
    return os.getenv(
        "VECTRA_KMS_MASTER_KEY",
        "vectra-enterprise-kms-master-kek-2026-erik-advisory-os",
    ).encode("utf-8")


def sign_mcp_envelope(envelope_id: str, mcp_session_id: str, tenant_user_id: str, tools: List[str]) -> str:
    msg = f"{envelope_id}:{mcp_session_id}:{tenant_user_id}:{','.join(tools)}".encode("utf-8")
    return hmac.new(_signing_secret(), msg, hashlib.sha256).hexdigest()


def verify_mcp_envelope(envelope: MCPMediatedEnvelope | None) -> None:
    """Verify that LLM context was mediated through the Zero-Trust MCP Gateway before model execution."""
    if envelope is None:
        raise MCPPolicyViolationError(
            "Direct model access to backend data is forbidden. All LLM context must be supplied via an "
            "MCPMediatedEnvelope issued by the VECTRA Zero-Trust MCP Gateway."
        )
    if not envelope.direct_db_access_blocked or not envelope.kms_secrets_redacted:
        raise MCPPolicyViolationError(
            "MCPMediatedEnvelope failed security policy flags (direct_db_access_blocked / kms_secrets_redacted)."
        )
    expected_sig = sign_mcp_envelope(
        envelope.envelope_id,
        envelope.mcp_session_id,
        envelope.tenant_user_id,
        envelope.tools_invoked,
    )
    if not hmac.compare_digest(envelope.signature_hmac, expected_sig):
        raise MCPPolicyViolationError("Invalid HMAC signature on MCPMediatedEnvelope.")


def sanitize_mcp_output(data: Any) -> Any:
    """Recursively strip any forbidden KMS/credential keys and redact secret token patterns."""
    if isinstance(data, dict):
        cleaned: Dict[str, Any] = {}
        for k, v in data.items():
            if str(k).lower() in FORBIDDEN_MCP_TARGETS:
                continue
            cleaned[k] = sanitize_mcp_output(v)
        return cleaned
    if isinstance(data, list):
        return [sanitize_mcp_output(item) for item in data]
    if isinstance(data, str):
        return SECRET_REDACTION_REGEX.sub("[REDACTED_BY_MCP_GATEWAY]", data)
    return data
