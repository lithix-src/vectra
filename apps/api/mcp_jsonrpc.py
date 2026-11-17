"""Model Context Protocol JSON-RPC 2.0 Method Dispatcher (`apps/api/mcp_jsonrpc.py`)."""
from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Dict

from mcp_catalog import (
    MCP_RESOURCES_CATALOG,
    MCP_TOOLS_CATALOG,
    MCPJsonRpcRequest,
    MCPPolicyViolationError,
)

if TYPE_CHECKING:
    from mcp_gateway import MCPZeroTrustGateway


async def dispatch_mcp_jsonrpc(
    gateway: "MCPZeroTrustGateway",
    req: MCPJsonRpcRequest,
    *,
    tenant_user_id: str,
    tenant_org_id: str,
) -> Dict[str, Any]:
    """Handle standard Model Context Protocol JSON-RPC 2.0 requests."""
    start = time.perf_counter()
    if req.method == "initialize":
        gateway._record_audit(
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
                "serverInfo": {"name": "vectra-zero-trust-mcp-gateway", "version": "1.2.0"},
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                },
                "policy": gateway.policy.model_dump(),
            },
        }

    if req.method == "tools/list":
        return {"jsonrpc": "2.0", "id": req.id, "result": {"tools": MCP_TOOLS_CATALOG}}

    if req.method == "resources/list":
        return {"jsonrpc": "2.0", "id": req.id, "result": {"resources": MCP_RESOURCES_CATALOG}}

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
            "mcp://vectra-graph-mcp/subgraph": (
                "vectra_get_rls_subgraph",
                {"node_ids": [], "vertical": "All Verticals"},
            ),
            "mcp://vectra-citations-mcp/sources": ("vectra_get_verified_citations", {"node_ids": []}),
            "mcp://vectra-notes-mcp/field-notes": ("vectra_get_consultant_notes", {"node_ids": []}),
        }
        if uri not in uri_to_tool:
            gateway._record_audit(
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
        res_data, audit = await gateway.call_tool(
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
        res_data, audit = await gateway.call_tool(
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
