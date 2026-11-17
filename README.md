# VECTRA — Enterprise AI Intelligence & Advisory OS

**VECTRA** is a full-stack, multi-tenant enterprise AI intelligence and decision-support OS engineered for **Erik**. It bridges deep technical architecture (`p99` latency, KV-cache topology, hybrid GraphRAG) and C-Suite strategy (audited ROI, regulatory exposure, capital allocation) while running **100% Sovereign Local LLMs** behind a **Zero-Trust MCP Gateway**.

> [!IMPORTANT]
> **Mandatory Engineering & Modularity Standard ([`AGENTS.md`](./AGENTS.md))**: Every authored file in VECTRA targets **<= 350 lines** with an enforced hard ceiling of **`420` lines (`350 + 20%`)** (Gate 2 of [`scripts/review_gates.py`](./scripts/review_gates.py)). Modules connect via explicit Python/TypeScript imports, and documentation stays synchronized via relative Markdown links.

---

## Table of Contents
1. [Documentation & Package Index](#1-documentation--package-index)
2. [Host Prerequisites (WSL & Windows Scoop + Rancher Desktop)](#2-host-prerequisites-wsl--windows-scoop--rancher-desktop)
3. [Unified Cross-Platform CLI (`scripts/vectra_cli.py`)](#3-unified-cross-platform-cli-scriptsvectra_clipy)
4. [Modular Monorepo Structure](#4-modular-monorepo-structure)
5. [Core Architectural Pillars](#5-core-architectural-pillars)
6. [6-Gate Review & 14-Stage End-to-End Verification](#6-6-gate-review--14-stage-end-to-end-verification)

---

## 1. Documentation & Package Index

| Package / Spec | Path | Responsibility | Linked Reference |
| :--- | :--- | :--- | :--- |
| **Dev & Agent Rules** | [`AGENTS.md`](./AGENTS.md) | Mandatory `350 + 20%` (`420` LOC) modularity cap, live doc sync, security invariants | [`AGENTS.md`](./AGENTS.md) |
| **WSL & Local Handoff** | [`HANDOFF.md`](./HANDOFF.md) | WSL / `D:\projects\vectra` workflow, Ollama setup, CLI runbook | [`HANDOFF.md`](./HANDOFF.md) |
| **`vectra-db`** | [`packages/db`](./packages/db) | Postgres 17 (`pgvector` + `Apache AGE`), `ENABLE`+`FORCE` RLS, `AES-256-GCM` KMS + HKDF, Scoring & Seed | [`packages/db/README.md`](./packages/db/README.md) |
| **`vectra-api`** | [`apps/api`](./apps/api) | Modular FastAPI routers, Sovereign Local LLM (`llm_runtime.py`), Zero-Trust MCP (`mcp_gateway.py`), `.pptx`/`.md` exports | [`apps/api/README.md`](./apps/api/README.md) |
| **`vectra-workers`** | [`apps/workers`](./apps/workers) | Temporal.io workflows/activities, KMS worker-only decryption, RSS/Atom & SEC EDGAR collector scheduler | [`apps/workers/README.md`](./apps/workers/README.md) |
| **`@vectra/web`** | [`apps/web`](./apps/web) | Modular Next.js 15 + React 19 3-Pane Workspace, ForceGraph, XYFlow Matrix, `[[Wikilinks]]`, Boardroom Mode | [`apps/web/README.md`](./apps/web/README.md) |
| **System Architecture** | [`/`](./) | High-level topology, ERD, 6-Gate review pipeline & container deployment | [`ARCHITECTURE_AND_ERD.md`](./ARCHITECTURE_AND_ERD.md) • [`DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md`](./DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md) • [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) |

---

## 2. Host Prerequisites (WSL & Windows Scoop + Rancher Desktop)

- **Python**: Managed strictly via `uv` and `uvx` (`uv python install`, `uv run python ...`). Never invoke bare `pip`.
- **Node & Frontend**: Node 22/24 LTS + `pnpm` ([`scripts/vectra_cli.py`](./scripts/vectra_cli.py) automatically falls back to `npx --yes pnpm@10` if Corepack shims are misconfigured).
- **Sovereign Local LLM**: Local **Ollama** (`http://localhost:11434`, `ollama pull qwen2.5:14b-instruct` and `ollama pull nomic-embed-text`) or local `litellm_proxy` ([`litellm_config.yaml`](./litellm_config.yaml)), `vllm`, `llamacpp`, or `lmstudio`.
- **Containers**: Rancher Desktop (`nerdctl compose` or `docker compose` via [`docker-compose.yml`](./docker-compose.yml)).

---

## 3. Unified Cross-Platform CLI (`scripts/vectra_cli.py`)

Run from the repository root in WSL, Linux, macOS, or Windows PowerShell:

```bash
# Zero-to-Verified Instantiation (.env, .venv, pre-commit hook, node_modules, 6-Gate Review + 14-Stage E2E)
uv run python scripts/vectra_cli.py instantiate

# Run 6-Gate Code Review (ToC + AGENTS.md, <=420 LOC budget, FORCE RLS, compileall, DOM IDs + tsc, 14/14 E2E)
uv run python scripts/vectra_cli.py review

# Launch FastAPI (:8000) + Next.js 15 (:3000, auto-selecting next free port if occupied)
uv run python scripts/vectra_cli.py dev

# Start / stop Rancher Desktop data & local LLM containers
uv run python scripts/vectra_cli.py infra-up
uv run python scripts/vectra_cli.py infra-down

# Clean transient caches (add --reset-db to reset local SQLite fallback DB)
uv run python scripts/vectra_cli.py clean --reset-db
```

---

## 4. Modular Monorepo Structure

```text
vectra/
├── AGENTS.md                       # Always-on modularity (350+20% LOC) & dev standards
├── apps/
│   ├── api/                        # Modular FastAPI service (all files <= 350 LOC)
│   │   ├── main.py                 # App entrypoint, health/LLM/MCP/graph routes & re-exports
│   │   ├── schemas.py              # Pydantic v2 request/response contracts
│   │   ├── graph_service.py        # RLS graph builder, safe 3-tier Cypher & [[Wikilink]] sync
│   │   ├── llm_policy.py           # Sovereign zero-commercial policy & 1536-d projection
│   │   ├── llm_runtime.py          # Ollama / LiteLLM / vLLM / llama.cpp execution engine
│   │   ├── mcp_catalog.py          # MCP schemas, tool/resource catalogs, HMAC & scrubbing
│   │   ├── mcp_jsonrpc.py          # JSON-RPC 2.0 protocol dispatcher
│   │   ├── mcp_gateway.py          # MCPZeroTrustGateway broker & audit log
│   │   ├── mcp_tools.py            # 9 RLS-scoped internal MCP tool handlers
│   │   ├── routes_ingest_auth.py   # KMS vault, X PKCE, webhooks & collector scheduler routes
│   │   ├── routes_copilot_deliverables.py # Subgraph Co-Pilot, Boardroom & .pptx/.md exports
│   │   └── pptx_generator.py       # 5-slide widescreen python-pptx deck builder
│   ├── web/src/                    # Modular Next.js 15 + React 19 UI (all files <= 350 LOC)
│   │   ├── app/                    # page.tsx workspace & present/[sessionId]/page.tsx
│   │   ├── components/             # Header, LeftRail, CenterPane, RightRail, Graph, Matrix, Editor
│   │   ├── components/modals/      # Ingest/Cypher, Runtime/MCP, Collector/CmdK modals
│   │   ├── hooks/                  # useVectraWorkspace & useVectraRuntimeActions
│   │   ├── lib/vectraDefaults.ts   # Typed presets & offline-safe defaults
│   │   └── types/vectra.ts         # Shared TypeScript interfaces
│   └── workers/                    # worker.py & tasks.py (Temporal + RSS/SEC EDGAR scheduler)
├── packages/db/                    # SQLAlchemy 2.0 Async, Postgres 17 RLS, KMS Vault & Seed
│   ├── sql/init_extensions_and_rls.sql
│   ├── vectra_db/                  # models, session, vault, security, scoring, seed_*.py
│   └── verify_vectra_stack.py      # 14-stage E2E verification suite
└── scripts/                        # vectra_cli.py & review_gates.py (6-Gate local review)
```

---

## 5. Core Architectural Pillars

1. **Multi-Tenant Hybrid Knowledge Graph ([`packages/db/README.md`](./packages/db/README.md))**: PostgreSQL 17 (`pgvector` `1536-d` + Apache AGE) with `ENABLE` + `FORCE ROW LEVEL SECURITY` across all 5 tables, zero-config SQLite fallback, `AES-256-GCM` KMS envelope vault + `HKDF-SHA256`, and real-time Composite Scoring:
   $$\text{Composite\_Score} = (0.35 \cdot \text{Base\_Signal} + \sum (\text{Authority} \times \text{Recency\_Decay} \times 9.5) + \text{Graph\_Centrality}) \times \text{Consultant\_Weight}$$
2. **Sovereign Local LLM & Zero-Trust MCP Gateway ([`apps/api/README.md`](./apps/api/README.md))**: `VECTRA_BLOCK_COMMERCIAL_LLMS=true` blocks OpenAI/Anthropic/Gemini/etc., while `MCPZeroTrustGateway` enforces HMAC-signed `MCPMediatedEnvelope` mediation and secret/KMS redaction across 4 internal MCP servers and 9 tools.
3. **Temporal Ingestion & Collector Scheduler ([`apps/workers/README.md`](./apps/workers/README.md))**: Idempotent 14-day cosine clustering (`> 0.84`) with configurable polling schedules for Fortune 500 AI CapEx, SEC EDGAR 8-K/10-K, and NIST/EU AI Act feeds.
4. **3-Pane Progressive Disclosure & Boardroom Mode ([`apps/web/README.md`](./apps/web/README.md))**: Dual-mode ForceGraph & Variant Diff Matrix, interactive Collector Scheduler, Local LLM & MCP Inspector modals, and `BroadcastChannel`-synced dual-window Presenter Console.

---

## 6. 6-Gate Review & 14-Stage End-to-End Verification

Every local commit automatically runs `uv run python scripts/vectra_cli.py review` (details in [`DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md`](./DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md); GitHub Actions is disabled via `uv run python scripts/vectra_cli.py disable-gh-actions`):
1. **Gate 1**: All 5 package `README.md` files (with `## Table of Contents`) + root [`AGENTS.md`](./AGENTS.md) + Zero GitHub Actions (`.github/workflows/` forbidden).
2. **Gate 2**: Authored file line-count budget (`<= 420` lines = `350 + 20%`).
3. **Gate 3**: PostgreSQL 17 `ENABLE` + `FORCE ROW LEVEL SECURITY` across all 5 core tables.
4. **Gate 4**: Python syntax & bytecode compilation across all backend/worker/CLI modules.
5. **Gate 5**: All 15 UI DOM Test-IDs (including Context Expression & Data Association Navigator) across `apps/web/src/**/*.tsx` + strict `tsc --noEmit`.
6. **Gate 6**: 14-Stage E2E verification ([`packages/db/verify_vectra_stack.py`](./packages/db/verify_vectra_stack.py)).
