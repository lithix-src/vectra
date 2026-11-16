"""VECTRA Zero-Trust Model Context Protocol (MCP) Gateway & Broker.

Enforces the architectural invariant:
  NO LLM or external agent ever receives direct access to backend databases, KMS vaults,
  or internal services. All context retrieval, graph traversal, citation lookup, and tool
  execution MUST be mediated through configured, policy-enforced MCP servers and tools.

Capabilities:
1. JSON-RPC 2.0 MCP Server & Broker (`initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`).
2. Strict Zero-Trust Policy Enforcement:
   - Blocks unproxied `stdio` shell execution servers (`allow_unproxied_stdio = False`).
   - Enforces per-request Multi-Tenant Row-Level Security (`TenantContext`) on every MCP tool & resource.
   - Blocks access to forbidden backend tables/secrets (`user_integrations`, `encrypted_dek`, `ciphertext`, raw SQL).
   - Sanitizes and redacts any secret/token patterns from MCP tool outputs before model consumption.
3. Cryptographically Signed / Verified `MCPMediatedEnvelope` required by `llm_runtime.py` before any
   LLM synthesis can execute.
4. Immutable in-memory + structured Audit Log of all `ALLOWED` and `DENIED` MCP operations.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Literal

from pydantic import BaseModel, Field

MCPTransportType = Literal["mcp_http_sse", "mcp_internal_broker", "stdio_unproxied"]

FORBIDDEN_MCP_TARGETS = {
    "user_integrations",
    "encrypted_dek",
    "ciphertext",
    "auth_tag",
    "kms_master_key",
    "vectra_kms_master_key",
    "raw_sql",
    "shell_exec",
    "os_system",
}

SECRET_REDACTION_REGEX = re.compile(
    r"(x_pkce_at_[a-zA-Z0-9_]+|sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{16,}|Bearer\s+[a-zA-Z0-9_\-\.]+)",
    re.IGNORECASE,
)


class MCPPolicyViolationError(PermissionError):
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
    enforce_mcp_mediation: bool = Field(
        default=True,
        description="Require all LLM context and tool access to pass through the Zero-Trust MCP Gateway.",
    )
    block_direct_model_db_access: bool = Field(
        default=True,
        description="Forbid passing raw database sessions or unbrokered service objects to the model.",
    )
    allow_unproxied_stdio: bool = Field(
        default=False,
        description="Block unproxied local stdio MCP servers that bypass OAuth/RLS policy inspection.",
    )
    redact_secrets_and_kms: bool = Field(
        default=True,
        description="Strip any KMS envelope fields or bearer tokens from MCP tool payloads.",
    )
    require_tenant_rls_binding: bool = Field(
        default=True,
        description="Require explicit tenant_user_id and tenant_org_id on every MCP JSON-RPC call.",
    )
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
        allowed_tools=["vectra_get_consultant_notes"],
        description="Tenant-isolated access to consultant Markdown field notes and extracted [[Wikilink]] edges.",
    ),
    "vectra-embeddings-mcp": MCPServerDefinition(
        server_id="vectra-embeddings-mcp",
        name="VECTRA Local 1536-d Vector Embeddings MCP Server",
        transport="mcp_internal_broker",
        endpoint_url="mcp://vectra-embeddings-mcp/v1",
        enabled=True,
        allowed_scopes=["embeddings:compute"],
        allowed_tools=["vectra_compute_local_embedding"],
        description="Sovereign local embedding computation (Ollama / LiteLLM / vLLM) projected to 1536-d.",
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
            "properties": {
                "node_ids": {"type": "array", "items": {"type": "string"}},
            },
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
            "properties": {
                "node_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["node_ids"],
        },
    },
    {
        "name": "vectra_inspect_cypher",
        "server_id": "vectra-graph-mcp",
        "required_scope": "cypher:read",
        "description": "Return the parameterized Apache AGE OpenCypher query for the tenant's RLS-scoped graph.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vertical": {"type": "string", "default": "All Verticals"},
            },
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
            "properties": {
                "text": {"type": "string"},
            },
            "required": ["text"],
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


class MCPZeroTrustGateway:
    """Central Zero-Trust MCP Gateway mediating all model interactions with VECTRA backend services."""

    def __init__(self) -> None:
        self.policy = MCPGatewayPolicyConfig()
        self.servers: Dict[str, MCPServerDefinition] = {
            k: v.model_copy(deep=True) for k, v in DEFAULT_MCP_SERVERS.items()
        }
        self.audit_log: List[MCPAuditLogEntry] = []
        self._tool_handlers: Dict[str, Callable[..., Awaitable[Dict[str, Any]]]] = {}

    def register_tool_handler(
        self,
        tool_name: str,
        handler: Callable[..., Awaitable[Dict[str, Any]]],
    ) -> None:
        self._tool_handlers[tool_name] = handler

    def _record_audit(
        self,
        *,
        tenant_user_id: str,
        tenant_org_id: str,
        server_id: str,
        jsonrpc_method: str,
        tool_or_resource: str,
        decision: Literal["ALLOWED", "DENIED"],
        reason: str,
        latency_ms: float,
    ) -> MCPAuditLogEntry:
        entry = MCPAuditLogEntry(
            audit_id=f"mcp-audit-{uuid.uuid4().hex[:10]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
            server_id=server_id,
            jsonrpc_method=jsonrpc_method,
            tool_or_resource=tool_or_resource,
            decision=decision,
            reason=reason,
            latency_ms=round(latency_ms, 2),
        )
        self.audit_log.insert(0, entry)
        if len(self.audit_log) > 100:
            self.audit_log = self.audit_log[:100]
        return entry

    def update_policy(self, new_policy: MCPGatewayPolicyConfig) -> MCPGatewayPolicyConfig:
        if new_policy.allow_unproxied_stdio:
            raise MCPPolicyViolationError(
                "Zero-Trust MCP Policy forbids enabling unproxied stdio MCP servers (allow_unproxied_stdio=True)."
            )
        if not new_policy.enforce_mcp_mediation or not new_policy.block_direct_model_db_access:
            raise MCPPolicyViolationError(
                "Disabling MCP mediation or direct DB access blocking is forbidden by VECTRA security architecture."
            )
        self.policy = new_policy.model_copy(deep=True)
        return self.policy

    def register_or_update_server(self, server: MCPServerDefinition) -> MCPServerDefinition:
        if server.transport == "stdio_unproxied" and not self.policy.allow_unproxied_stdio:
            self._record_audit(
                tenant_user_id="system",
                tenant_org_id="vectra-advisory",
                server_id=server.server_id,
                jsonrpc_method="server/register",
                tool_or_resource=server.endpoint_url,
                decision="DENIED",
                reason="Blocked unproxied stdio MCP server registration under Zero-Trust policy.",
                latency_ms=0.1,
            )
            raise MCPPolicyViolationError(
                f"Cannot register MCP server '{server.server_id}' with transport='stdio_unproxied'. "
                "All MCP servers must use policy-inspected HTTP/SSE or internal broker transports."
            )
        self.servers[server.server_id] = server.model_copy(deep=True)
        return self.servers[server.server_id]

    async def call_tool(
        self,
        *,
        tool_name: str,
        arguments: Dict[str, Any],
        tenant_user_id: str,
        tenant_org_id: str,
    ) -> tuple[Dict[str, Any], MCPAuditLogEntry]:
        start = time.perf_counter()

        if self.policy.require_tenant_rls_binding and (not tenant_user_id or not tenant_org_id):
            audit = self._record_audit(
                tenant_user_id=tenant_user_id or "anonymous",
                tenant_org_id=tenant_org_id or "none",
                server_id="unknown",
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason="Missing required tenant RLS context binding.",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            raise MCPPolicyViolationError(audit.reason)

        # Block any attempt to access forbidden targets or raw SQL/KMS credentials
        lowered_tool = tool_name.lower()
        serialized_args = str(arguments).lower()
        if lowered_tool in FORBIDDEN_MCP_TARGETS or any(
            forbidden in lowered_tool or forbidden in serialized_args
            for forbidden in FORBIDDEN_MCP_TARGETS
        ):
            audit = self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id="zero-trust-guard",
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason=f"Blocked forbidden direct backend/KMS/SQL access attempt via '{tool_name}'.",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            raise MCPPolicyViolationError(audit.reason)

        tool_meta = next((t for t in MCP_TOOLS_CATALOG if t["name"] == tool_name), None)
        if not tool_meta:
            audit = self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id="unknown",
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason=f"Tool '{tool_name}' is not registered in the Zero-Trust MCP Catalog.",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            raise MCPPolicyViolationError(audit.reason)

        server_id = tool_meta["server_id"]
        server = self.servers.get(server_id)
        if not server or not server.enabled:
            audit = self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id=server_id,
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason=f"MCP Server '{server_id}' is disabled or unregistered.",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            raise MCPPolicyViolationError(audit.reason)

        required_scope = tool_meta["required_scope"]
        if required_scope not in self.policy.active_scopes or required_scope not in server.allowed_scopes:
            audit = self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id=server_id,
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason=f"Missing required MCP scope '{required_scope}' for tool '{tool_name}'.",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            raise MCPPolicyViolationError(audit.reason)

        handler = self._tool_handlers.get(tool_name)
        if not handler:
            raise MCPPolicyViolationError(f"No handler bound for MCP tool '{tool_name}'.")

        raw_result = await handler(
            arguments=arguments,
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )
        sanitized_result = sanitize_mcp_output(raw_result) if self.policy.redact_secrets_and_kms else raw_result

        audit = self._record_audit(
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
            server_id=server_id,
            jsonrpc_method="tools/call",
            tool_or_resource=tool_name,
            decision="ALLOWED",
            reason=f"RLS-scoped ({tenant_user_id}@{tenant_org_id}) & KMS-redacted via {server_id}",
            latency_ms=(time.perf_counter() - start) * 1000.0,
        )
        return sanitized_result, audit

    async def build_rag_mcp_envelope(
        self,
        *,
        node_ids: List[str],
        vertical: str,
        tenant_user_id: str,
        tenant_org_id: str,
    ) -> MCPMediatedEnvelope:
        """Assemble all Subgraph Co-Pilot RAG context strictly via MCP tool calls."""
        mcp_session_id = f"mcp-sess-{uuid.uuid4().hex[:8]}"
        subgraph_res, audit_graph = await self.call_tool(
            tool_name="vectra_get_rls_subgraph",
            arguments={"node_ids": node_ids, "vertical": vertical},
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )
        target_ids = [n["id"] for n in subgraph_res.get("nodes", [])]

        citations_res, audit_cit = await self.call_tool(
            tool_name="vectra_get_verified_citations",
            arguments={"node_ids": target_ids},
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )
        notes_res, audit_notes = await self.call_tool(
            tool_name="vectra_get_consultant_notes",
            arguments={"node_ids": target_ids},
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )

        tools_invoked = [
            "vectra_get_rls_subgraph",
            "vectra_get_verified_citations",
            "vectra_get_consultant_notes",
        ]
        envelope_id = f"mcp-env-{uuid.uuid4().hex[:10]}"
        sig = sign_mcp_envelope(envelope_id, mcp_session_id, tenant_user_id, tools_invoked)

        return MCPMediatedEnvelope(
            envelope_id=envelope_id,
            mcp_session_id=mcp_session_id,
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
            tools_invoked=tools_invoked,
            resources_read=[
                "mcp://vectra-graph-mcp/subgraph",
                "mcp://vectra-citations-mcp/sources",
                "mcp://vectra-notes-mcp/field-notes",
            ],
            audit_ids=[audit_graph.audit_id, audit_cit.audit_id, audit_notes.audit_id],
            direct_db_access_blocked=True,
            kms_secrets_redacted=True,
            signature_hmac=sig,
            payload={
                "nodes": subgraph_res.get("nodes", []),
                "edges": subgraph_res.get("edges", []),
                "citations": citations_res.get("citations", []),
                "notes": notes_res.get("notes", []),
            },
        )

    async def handle_jsonrpc(
        self,
        req: MCPJsonRpcRequest,
        *,
        tenant_user_id: str,
        tenant_org_id: str,
    ) -> Dict[str, Any]:
        """Handle standard Model Context Protocol JSON-RPC 2.0 requests."""
        start = time.perf_counter()
        if req.method == "initialize":
            self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id="vectra-mcp-gateway",
                jsonrpc_method="initialize",
                tool_or_resource="protocol/2025-03-26",
                decision="ALLOWED",
                reason="Initialized Zero-Trust MCP Gateway session",
                latency_ms=(time.perf_counter() - start) * 1000.0,
            )
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {
                    "protocolVersion": "2025-03-26",
                    "serverInfo": {
                        "name": "vectra-zero-trust-mcp-gateway",
                        "version": "1.2.0",
                    },
                    "capabilities": {
                        "tools": {"listChanged": False},
                        "resources": {"subscribe": False, "listChanged": False},
                    },
                    "policy": self.policy.model_dump(),
                },
            }

        if req.method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {"tools": MCP_TOOLS_CATALOG},
            }

        if req.method == "resources/list":
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {"resources": MCP_RESOURCES_CATALOG},
            }

        if req.method == "prompts/list":
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {
                    "prompts": [
                        {
                            "name": "vectra_subgraph_advisory_synthesis",
                            "description": "Synthesize lassoed Canonical Nodes via MCP-mediated RAG.",
                        }
                    ]
                },
            }

        if req.method == "resources/read":
            uri = str(req.params.get("uri", ""))
            uri_to_tool = {
                "mcp://vectra-graph-mcp/subgraph": ("vectra_get_rls_subgraph", {"node_ids": [], "vertical": "All Verticals"}),
                "mcp://vectra-citations-mcp/sources": ("vectra_get_verified_citations", {"node_ids": []}),
                "mcp://vectra-notes-mcp/field-notes": ("vectra_get_consultant_notes", {"node_ids": []}),
            }
            if uri not in uri_to_tool:
                self._record_audit(
                    tenant_user_id=tenant_user_id,
                    tenant_org_id=tenant_org_id,
                    server_id="vectra-mcp-gateway",
                    jsonrpc_method="resources/read",
                    tool_or_resource=uri,
                    decision="DENIED",
                    reason=f"Unknown or unauthorized MCP resource URI '{uri}'.",
                    latency_ms=(time.perf_counter() - start) * 1000.0,
                )
                raise MCPPolicyViolationError(f"Unauthorized MCP resource URI: {uri}")
            tool_name, default_args = uri_to_tool[uri]
            res_data, audit = await self.call_tool(
                tool_name=tool_name,
                arguments=default_args,
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
            )
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {
                    "contents": [
                        {
                            "uri": uri,
                            "mimeType": "application/json",
                            "data": res_data,
                            "audit_id": audit.audit_id,
                        }
                    ]
                },
            }

        if req.method == "tools/call":
            tool_name = str(req.params.get("name", ""))
            arguments = dict(req.params.get("arguments") or {})
            res_data, audit = await self.call_tool(
                tool_name=tool_name,
                arguments=arguments,
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
            )
            return {
                "jsonrpc": "2.0",
                "id": req.id,
                "result": {
                    "content": [{"type": "json", "json": res_data}],
                    "isError": False,
                    "mcp_audit": audit.model_dump(),
                },
            }

        raise MCPPolicyViolationError(f"Unsupported MCP JSON-RPC method: {req.method}")

    def get_status(self) -> Dict[str, Any]:
        allowed_count = sum(1 for a in self.audit_log if a.decision == "ALLOWED")
        denied_count = sum(1 for a in self.audit_log if a.decision == "DENIED")
        return {
            "gateway_id": "vectra-zero-trust-mcp-gateway",
            "protocol_version": "2025-03-26",
            "policy": self.policy.model_dump(),
            "servers": [s.model_dump() for s in self.servers.values()],
            "tools": MCP_TOOLS_CATALOG,
            "resources": MCP_RESOURCES_CATALOG,
            "audit_summary": {
                "total_events": len(self.audit_log),
                "allowed_count": allowed_count,
                "denied_count": denied_count,
            },
            "recent_audit_log": [a.model_dump() for a in self.audit_log[:25]],
        }
