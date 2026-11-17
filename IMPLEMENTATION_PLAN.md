# IMPLEMENTATION_PLAN & STATE — VECTRA: Enterprise AI Intelligence & Advisory OS

> [!IMPORTANT]
> **Current Project State**: **PHASES 1–7 COMPLETE (`14/14` E2E Checks & `6/6` Review Gates Verified) — MODULAR ARCHITECTURE ENFORCED**
> - **Mandatory Modularity & Dev Standard ([`AGENTS.md`](./AGENTS.md))**: Every authored file across Python, TypeScript/React, SQL, YAML, and Markdown is strictly capped at **`<= 350 + 20%` (`420` lines)** (currently every authored file is **<= 400 lines**), enforced by **Gate 2** of [`scripts/review_gates.py`](./scripts/review_gates.py).
> - **Sovereign Local LLM & Embeddings**: [`apps/api/llm_policy.py`](./apps/api/llm_policy.py) & [`apps/api/llm_runtime.py`](./apps/api/llm_runtime.py) (`ollama` default, `VECTRA_BLOCK_COMMERCIAL_LLMS=true`).
> - **Zero-Trust MCP Mediation**: [`apps/api/mcp_catalog.py`](./apps/api/mcp_catalog.py), [`apps/api/mcp_jsonrpc.py`](./apps/api/mcp_jsonrpc.py), [`apps/api/mcp_gateway.py`](./apps/api/mcp_gateway.py) & [`apps/api/mcp_tools.py`](./apps/api/mcp_tools.py) (4 servers, 9 RLS-scoped tools, HMAC-signed `MCPMediatedEnvelope`).
> - **Documentation Sync**: Linked package `README.md`s with `## Table of Contents` enforced by **Gate 1**.

---

## Completed Delivery Milestones

| Phase | Scope | Key Modules & References | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1–4** | Core Postgres 17 RLS + `pgvector` + AGE, KMS Envelope Vault, Temporal Workers, 3-Pane UI, Boardroom `.pptx` | [`packages/db/README.md`](./packages/db/README.md) • [`apps/workers/README.md`](./apps/workers/README.md) | Verified |
| **Phase 5** | Custom Signal Ingestion (`/api/signals/ingest`), Markdown Brief Export (`/api/export/brief`), `BroadcastChannel` Boardroom Sync | [`apps/api/routes_ingest_auth.py`](./apps/api/routes_ingest_auth.py) • [`apps/api/routes_copilot_deliverables.py`](./apps/api/routes_copilot_deliverables.py) | Verified |
| **Phase 6** | Sovereign Local LLM (`ollama` / `litellm_proxy` / `vllm`), Zero-Trust MCP Gateway, RSS/Atom & SEC EDGAR Collector Scheduler | [`apps/api/README.md`](./apps/api/README.md) • [`apps/workers/tasks.py`](./apps/workers/tasks.py) | Verified |
| **Phase 7** | Code Review Hardening, Interactive Collector Scheduler UI, `350 + 20%` (`420` LOC) Modular Decomposition & 6-Gate Pre-Commit Enforcement | [`AGENTS.md`](./AGENTS.md) • [`scripts/review_gates.py`](./scripts/review_gates.py) • [`apps/web/README.md`](./apps/web/README.md) | Verified |

---

## Key Code Review Fixes & Hardening Highlights (Phase 7)
1. **Idempotent Citation Deduplication ([`apps/workers/worker.py`](./apps/workers/worker.py))**: `cluster_and_attach_source_activity()` deduplicates repeated `(node_id, exact_quote, owner_user_id, visibility)` sources so recurring collector runs refresh `published_at` without inflating `Composite_Score`.
2. **Sanitized 3-Tier RLS OpenCypher Generation ([`apps/api/graph_service.py`](./apps/api/graph_service.py))**: `build_safe_cypher_query()` strips injection metacharacters and emits full `global` / `org_private` / `user_private` predicates.
3. **Exact Score Breakdown Parity ([`packages/db/vectra_db/scoring.py`](./packages/db/vectra_db/scoring.py) & [`IngestAndCypherModals.tsx`](./apps/web/src/components/modals/IngestAndCypherModals.tsx))**: Exposes `base_signal_component` alongside `source_authority_component` and `graph_centrality_component` so UI math matches backend scoring identically.
4. **Interactive Collector Scheduler Modal ([`CollectorAndCmdkModals.tsx`](./apps/web/src/components/modals/CollectorAndCmdkModals.tsx))**: Wires `GET /api/collectors/packs` and `POST /api/collectors/schedule` into the 3-Pane workspace header, left rail, and `Cmd+K` palette.
5. **Local LLM Read-Timeout Resilience ([`apps/api/llm_runtime.py`](./apps/api/llm_runtime.py))**: Uses `httpx.Timeout(60.0, connect=2.0)` so local Ollama structured JSON synthesis completes reliably while offline fallback stays sub-10ms.
