# `vectra-api` — Modular FastAPI Gateway, Sovereign Local LLM & Zero-Trust MCP (`/apps/api`)

`vectra-api` is the modular asynchronous FastAPI service (`port 8000`) powering **VECTRA**. All files adhere to the `<= 350 + 20%` (`420` LOC) modularity standard defined in [`../../AGENTS.md`](../../AGENTS.md).

---

## Table of Contents
1. [Modular File Map](#1-modular-file-map)
2. [REST, Local LLM, MCP & Deliverable Endpoints](#2-rest-local-llm-mcp--deliverable-endpoints)
3. [Sovereign Local LLM Policy & Zero-Trust MCP Mediation](#3-sovereign-local-llm-policy--zero-trust-mcp-mediation)
4. [Sanitized 3-Tier RLS OpenCypher & `[[Wikilink]]` Edge Sync](#4-sanitized-3-tier-rls-opencypher--wikilink-edge-sync)
5. [Running Locally (`uv`)](#5-running-locally-uv)

---

## 1. Modular File Map

| File | Primary Symbols | Responsibility |
| :--- | :--- | :--- |
| [`main.py`](./main.py) | `app`, core `/api/graph`, `/api/llm/*`, `/api/mcp/*` routes | FastAPI app entrypoint, router composition, and backward-compatible symbol re-exports. |
| [`schemas.py`](./schemas.py) | `CopilotQueryRequest`, `CopilotStructuredResponse`, `CollectorScheduleUpdateRequest`, `CustomSignalIngestRequest` | Pydantic v2 request/response schemas and vertical/lens literals. |
| [`graph_service.py`](./graph_service.py) | `build_rls_graph_payload`, `build_safe_cypher_query`, `sync_consultant_note_and_wikilinks` | RLS graph serialization, injection-safe 3-tier RLS Apache AGE openCypher builder, and `[[Wikilink]]` edge upsertion. |
| [`llm_policy.py`](./llm_policy.py) | `LocalLLMConfig`, `validate_sovereign_local_policy`, `project_vector_to_1536` | Zero-commercial cloud LLM guardrail (`VECTRA_BLOCK_COMMERCIAL_LLMS=true`) and `1536-d` L2 vector projection. |
| [`llm_runtime.py`](./llm_runtime.py) | `probe_local_llm_status`, `embed_text_local_1536`, `generate_local_rag_synthesis` | Local execution engine (`ollama` default, `litellm_proxy`, `vllm`, `llamacpp`, `lmstudio`) with `httpx.Timeout(60.0, connect=2.0)`. |
| [`mcp_catalog.py`](./mcp_catalog.py) | `DEFAULT_MCP_SERVERS`, `MCP_TOOLS_CATALOG`, `verify_mcp_envelope`, `sanitize_mcp_output` | 4 internal MCP servers, 9 tool schemas, HMAC-SHA256 envelope signing, and KMS/token redaction. |
| [`mcp_jsonrpc.py`](./mcp_jsonrpc.py) | `dispatch_mcp_jsonrpc` | JSON-RPC 2.0 protocol handler (`initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`). |
| [`mcp_gateway.py`](./mcp_gateway.py) | `MCPZeroTrustGateway` | Policy-enforced MCP broker blocking `stdio_unproxied`, `FORBIDDEN_MCP_TARGETS`, and unmediated DB access. |
| [`mcp_tools.py`](./mcp_tools.py) | `mcp_gateway` + 9 `_mcp_tool_*` handlers | Binds RLS-scoped graph, citation, note, Cypher, embedding, collector, and manifest handlers. |
| [`routes_ingest_auth.py`](./routes_ingest_auth.py) | `router`, collector, integration, PKCE & webhook routes | KMS Vault metadata, X OAuth 2.0 PKCE, dynamic `intel+<user>@` newsletter webhook, custom signal ingest & collector schedules. |
| [`routes_copilot_deliverables.py`](./routes_copilot_deliverables.py) | `router`, `query_subgraph_copilot`, `export_pptx_deck`, `export_executive_brief` | MCP-mediated Subgraph Co-Pilot RAG, Boardroom sessions, `.pptx` & `.md` deliverable generators. |
| [`pptx_generator.py`](./pptx_generator.py) | `build_subgraph_pptx()` | 5-slide 16:9 dark executive presentation builder (`python-pptx`). |

---

## 2. REST, Local LLM, MCP & Deliverable Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, active RLS/KMS flags, and active Sovereign Local LLM configuration. |
| `GET` / `POST` | `/api/llm/status` • `/api/llm/config` • `/api/llm/embed` | Probe local LLM daemon, switch local runtime/model (`HTTP 400` on commercial cloud hosts/models), or compute `1536-d` embeddings. |
| `GET` / `POST` | `/api/mcp/status` • `/api/mcp/policy` • `/api/mcp/servers` • `/api/mcp/rpc` | Inspect/configure Zero-Trust MCP Gateway and execute JSON-RPC 2.0 tool/resource calls. |
| `GET` | `/api/graph` • `/api/graph/cypher` | Fetch RLS-scoped Canonical Graph (`?vertical=`) or sanitized 3-tier RLS Apache AGE openCypher SQL. |
| `PATCH` / `PUT` / `POST` | `/api/nodes/{id}/weight` • `/api/nodes/{id}/note` • `/api/edges` | Adjust Consultant Weight (`0.5x–5.0x`), sync Obsidian `[[Wikilink]]` notes, or create manual edges. |
| `GET` / `POST` | `/api/integrations` • `/api/integrations/{provider}/refresh` • `/api/auth/x/*` | Inspect masked `AES-256-GCM` envelopes, rotate tokens in worker memory, or run X OAuth 2.0 PKCE. |
| `GET` / `POST` | `/api/collectors/packs` • `/api/collectors/schedule` • `/api/collectors/run` | Inspect curated collector packs, configure polling intervals (`5m–1440m`), and trigger immediate runs. |
| `POST` | `/api/webhooks/inbound-email` • `/api/signals/ingest` | Cluster forwarded paid newsletters (`intel+<user>@ingest.vectra.ai`) or custom field signals (`cosine > 0.84`). |
| `POST` / `GET` | `/api/copilot/query` • `/api/present/session` • `/api/present/{id}` • `/api/export/pptx` • `/api/export/brief` | Run MCP-mediated Subgraph Co-Pilot RAG, launch Boardroom Mode, or download `.pptx` / `.md` deliverables. |

---

## 3. Sovereign Local LLM Policy & Zero-Trust MCP Mediation

- **Commercial Cloud Guardrail ([`llm_policy.py`](./llm_policy.py))**: Blocks `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, `openrouter.ai`, etc., and model prefixes `gpt-*`, `claude-*`, `gemini-*`, `o1-*`, `o3-*`, `o4-*`.
- **Mandatory MCP Envelope ([`mcp_gateway.py`](./mcp_gateway.py))**: `generate_local_rag_synthesis()` verifies the HMAC-SHA256 signature on `MCPMediatedEnvelope` before any model call executes, raising `MCPPolicyViolationError` on unmediated calls.

---

## 4. Sanitized 3-Tier RLS OpenCypher & `[[Wikilink]]` Edge Sync

- `build_safe_cypher_query()` in [`graph_service.py`](./graph_service.py) strips injection characters and emits full `global` / `org_private` / `user_private` visibility predicates.
- `sync_consultant_note_and_wikilinks()` parses `[[Target Node]]` links and upserts `user_private` `associative_edges`.

---

## 5. Running Locally (`uv`)

```bash
uv run python scripts/vectra_cli.py api
# or concurrent API + Next.js web:
uv run python scripts/vectra_cli.py dev
```
