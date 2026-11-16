# `vectra-api` — FastAPI Intelligence Gateway, Co-Pilot RAG & `.pptx` Engine (`/apps/api`)

`vectra-api` is the asynchronous Python FastAPI service (`port 8000`) powering **VECTRA**. It enforces Row-Level Security (`RLS`) per request, syncs Obsidian `[[wikilinks]]` into graph edges, handles X OAuth 2.0 PKCE and inbound paid newsletter webhooks, executes Subgraph Co-Pilot RAG queries, and generates downloadable `.pptx` boardroom presentations via `python-pptx`.

---

## Table of Contents
1. [Module Overview](#1-module-overview)
2. [REST & Webhook API Reference](#2-rest--webhook-api-reference)
3. [Obsidian `[[Wikilink]]` Bidirectional Edge Synchronization](#3-obsidian-wikilink-bidirectional-edge-synchronization)
4. [Subgraph Co-Pilot Structured RAG Engine](#4-subgraph-co-pilot-structured-rag-engine)
5. [Executive `.pptx` Deck Generator (`python-pptx`)](#5-executive-pptx-deck-generator-python-pptx)
6. [Cross-Platform `uv` & `uvx` Commands](#6-cross-platform-uv--uvx-commands)

---

## 1. Module Overview

| File | Primary Symbols | Responsibility |
| :--- | :--- | :--- |
| [`main.py`](./main.py) | `app`, `get_graph`, `save_consultant_note_and_sync_wikilinks`, `query_subgraph_copilot`, `export_pptx_deck` | FastAPI application, Pydantic v2 / `instructor` structured response schemas, OAuth 2.0 PKCE & webhook routes. |
| [`llm_runtime.py`](./llm_runtime.py) | `LocalLLMConfig`, `probe_local_llm_status`, `generate_local_rag_synthesis`, `embed_text_local_1536`, `validate_sovereign_local_policy` | Sovereign Local-First LLM & Embedding engine (`ollama` default, `litellm_proxy`, `vllm`, `llamacpp`, `lmstudio`) with strict zero-commercial cloud guardrail. |
| [`mcp_gateway.py`](./mcp_gateway.py) | `MCPZeroTrustGateway`, `MCPMediatedEnvelope`, `verify_mcp_envelope`, `sanitize_mcp_output` | Zero-Trust Model Context Protocol (MCP) JSON-RPC 2.0 Gateway & Broker enforcing 0% direct model DB/KMS access. |
| [`pptx_generator.py`](./pptx_generator.py) | `build_subgraph_pptx()` | 5-slide widescreen (16:9) executive presentation builder using `python-pptx`. |
| [`pyproject.toml`](./pyproject.toml) | `vectra-api` | Package metadata and dependencies (`fastapi`, `uvicorn`, `pydantic`, `instructor`, `python-pptx`, `vectra-db`). |

---

## 2. REST & Webhook API Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status, active RLS enforcement flag, KMS cipher metadata (`AES-256-GCM`), and active Sovereign Local LLM config. |
| `GET` | `/api/llm/status` | Probes the active local LLM daemon (`ollama` default, `litellm_proxy`, `vllm`, `llamacpp`, `lmstudio`), lists discovered local models, and reports zero-commercial policy status. |
| `POST` | `/api/llm/config` | Switches the active local LLM provider, base URL, chat model, or embedding model at runtime (`HTTP 400` if any commercial cloud endpoint/model is passed). |
| `POST` | `/api/llm/embed` | Generates a `1536-d` vector embedding via the configured local embedding model (`nomic-embed-text` / `bge-m3`) with deterministic local projection & fallback. |
| `GET` | `/api/mcp/status` | Returns Zero-Trust MCP Gateway policy, registered MCP servers/tools, and immutable audit log. |
| `POST` | `/api/mcp/rpc` | Executes a Zero-Trust Model Context Protocol (MCP) JSON-RPC 2.0 request (`initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`). |
| `GET` | `/api/graph` | Returns RLS-filtered `canonical_nodes` (ranked by real-time `composite_score`), `associative_edges`, `sources`, and `consultant_note`. Supports `?vertical=` filter. |
| `GET` | `/api/graph/cypher` | Returns the Apache AGE OpenCypher SQL query corresponding to the active vertical and tenant RLS scope. |
| `PATCH` | `/api/nodes/{node_id}/weight` | Updates `consultant_weight` (`0.5x–5.0x`) and recomputes `Composite_Score` in real time. |
| `PUT` | `/api/nodes/{node_id}/note` | Saves Markdown field note, parses `[[Wikilinks]]`, and auto-upserts `associative_edges`. |
| `POST` | `/api/edges` | Creates or updates a manual directed `associative_edge` (`ENABLES`, `CONFLICTS_WITH`, `REGULATES`, `CASE_STUDY_OF`, `REPLACES`). |
| `GET` | `/api/integrations` | Lists `user_integrations` metadata (DEK fingerprint, scopes, expiry status) without exposing plaintext tokens. |
| `GET` | `/api/auth/x/connect` | Generates an X (Twitter) OAuth 2.0 PKCE `S256` challenge URL (`tweet.read`, `users.read`, `list.read`, `bookmark.read`, `offline.access`). |
| `GET` | `/api/auth/x/callback` | Completes PKCE exchange and triggers Temporal worker token sealing. |
| `POST` | `/api/integrations/{provider}/refresh` | Invokes worker in-memory KMS decryption and token/cookie rotation. |
| `POST` | `/api/webhooks/inbound-email` | Parses forwarded paid newsletters sent to `intel+erik@ingest.vectra.ai` and clusters them onto 14-day Canonical Nodes (`cosine > 0.84`). |
| `POST` | `/api/signals/ingest` | Ingests a custom interactive field signal (`CustomSignalIngestRequest`) and clusters it into 14-day Canonical Nodes under the caller's tenant RLS scope. |
| `POST` | `/api/collectors/run` | Runs Public Enterprise & Regulatory Collectors (F500 Eng Blogs, SEC EDGAR 8-K/10-K, NIST/EU AI Act/FDA). |
| `GET` | `/api/collectors/packs` | Lists curated collector packs (`f500_ai_capex`, `sec_edgar_8k`, `nist_eu_ai_act`) and their worker polling schedules. |
| `POST` | `/api/collectors/schedule` | Configures collector pack polling interval and optionally triggers an immediate run. |
| `POST` | `/api/copilot/query` | Executes Subgraph Co-Pilot RAG strictly over lasso-selected nodes, edges, quotes, and private field notes using Sovereign Local LLM (`ollama` / `litellm_proxy` / `vllm` / `llamacpp`). |
| `POST` | `/api/present/session` | Creates a Boardroom Mode presentation session (`/present/[sessionId]`). |
| `POST` | `/api/export/pptx` | Streams a 5-slide widescreen `.pptx` presentation deck from the selected subgraph. |
| `POST` | `/api/export/brief` | Streams a comprehensive Markdown Executive Advisory Memorandum (`VECTRA_Executive_Brief.md`, `text/markdown`) with Multi-Lens Synthesis, Variant Diff Matrix, Verified Primary Evidence Table, and 90-Day Action Plan. |

---

## 3. Obsidian `[[Wikilink]]` Bidirectional Edge Synchronization

When Erik saves a note via `PUT /api/nodes/{node_id}/note`:
1. `extract_wikilinks()` parses all `[[Target Node Title]]` references.
2. Each target is matched against visible `CanonicalNode` records (by exact title, slug, or case-insensitive substring).
3. Matching targets are automatically upserted into `associative_edges` (`is_user_created = True`, `visibility = 'user_private'`) and returned to the frontend so `react-force-graph-2d` renders the new gold edge immediately.

---

## 4. Subgraph Co-Pilot Structured RAG Engine

`POST /api/copilot/query` accepts:
- `node_ids`: List of lasso-selected Canonical Node IDs
- `question`: Strategic or architectural query
- `variant_lens`: `c_suite` | `cto` | `contrarian`

It serializes the subgraph's nodes, incident edges, verbatim primary quotes (`[Public]` + `[Subscriber Licensed]`), and Erik's private field notes into a strict `CopilotStructuredResponse` (`executive_answer`, `architectural_implications`, `contrarian_risks`, `recommended_90_day_actions`, `citations_used`).

---

## 5. Executive `.pptx` Deck Generator (`python-pptx`)

[`pptx_generator.py`](./pptx_generator.py) generates a 16:9 widescreen dark-themed presentation containing:
1. **Slide 1**: Title, Variant Lens Badge, Subgraph KPI Summary Cards
2. **Slide 2**: Executive Thesis & Ranked Canonical Signal Synthesis
3. **Slide 3**: Verified Market Evidence Table with Direct URLs & `[Public]` vs. `[Subscriber Licensed]` Provenance Tags
4. **Slide 4**: Contrarian Counterpoints & Variant Diff Matrix (Vendor Claim vs. Builder Reality vs. Production Proof)
5. **Slide 5**: 90-Day Enterprise Execution & Governance Action Plan (Days 1–30, 31–60, 61–90)

---

## 6. Cross-Platform `uv` & `uvx` Commands

```powershell
# Start FastAPI server with hot-reload from monorepo root
uv run python scripts/vectra_cli.py api

# Or run directly via uvicorn inside apps/api
cd apps/api
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
