"""VECTRA Zero-Trust Model Context Protocol (MCP) Gateway & Broker (`apps/api/mcp_gateway.py`).

Imports schemas, catalogs, HMAC envelope verification, and output redaction from `mcp_catalog.py`
and JSON-RPC 2.0 protocol routing from `mcp_jsonrpc.py`.
"""
from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Literal

from mcp_catalog import (
    DEFAULT_MCP_SERVERS,
    FORBIDDEN_MCP_TARGETS,
    MCP_RESOURCES_CATALOG,
    MCP_TOOLS_CATALOG,
    SECRET_REDACTION_REGEX,
    MCPAuditLogEntry,
    MCPGatewayPolicyConfig,
    MCPGatewaySecurityError,
    MCPJsonRpcRequest,
    MCPMediatedEnvelope,
    MCPPolicyViolationError,
    MCPServerDefinition,
    MCPTransportType,
    sanitize_mcp_output,
    sign_mcp_envelope,
    verify_mcp_envelope,
)
from mcp_jsonrpc import dispatch_mcp_jsonrpc


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

        lowered_tool = tool_name.lower()
        serialized_args = json.dumps(arguments, default=str).lower()
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
        if not server or not server.enabled or (server.allowed_tools and tool_name not in server.allowed_tools):
            audit = self._record_audit(
                tenant_user_id=tenant_user_id,
                tenant_org_id=tenant_org_id,
                server_id=server_id,
                jsonrpc_method="tools/call",
                tool_or_resource=tool_name,
                decision="DENIED",
                reason=f"MCP Server '{server_id}' is disabled or does not permit '{tool_name}'.",
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

    async def create_rag_envelope(
        self,
        *,
        node_ids: List[str],
        vertical: str = "All Verticals",
        tenant_user_id: str = "erik",
        tenant_org_id: str = "vectra-advisory",
    ) -> MCPMediatedEnvelope:
        """Alias for `build_rag_mcp_envelope` matching local handoff specification."""
        return await self.build_rag_mcp_envelope(
            node_ids=node_ids,
            vertical=vertical,
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )

    async def handle_jsonrpc(
        self,
        req: MCPJsonRpcRequest,
        *,
        tenant_user_id: str,
        tenant_org_id: str,
    ) -> Dict[str, Any]:
        return await dispatch_mcp_jsonrpc(
            self,
            req,
            tenant_user_id=tenant_user_id,
            tenant_org_id=tenant_org_id,
        )

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


__all__ = [
    "DEFAULT_MCP_SERVERS",
    "FORBIDDEN_MCP_TARGETS",
    "MCPAuditLogEntry",
    "MCPGatewayPolicyConfig",
    "MCPGatewaySecurityError",
    "MCPJsonRpcRequest",
    "MCPMediatedEnvelope",
    "MCPPolicyViolationError",
    "MCPServerDefinition",
    "MCPTransportType",
    "MCPZeroTrustGateway",
    "MCP_RESOURCES_CATALOG",
    "MCP_TOOLS_CATALOG",
    "SECRET_REDACTION_REGEX",
    "sanitize_mcp_output",
    "sign_mcp_envelope",
    "verify_mcp_envelope",
]
