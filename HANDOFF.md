# VECTRA — WSL & Local Development Handoff (`HANDOFF.md`)

## Table of Contents
1. [Workspace, Toolchain & Modularity Mandates](#1-workspace-toolchain--modularity-mandates)
2. [Modular Architecture & Linked Package Map](#2-modular-architecture--linked-package-map)
3. [Unified CLI & Verification Commands (`scripts/vectra_cli.py`)](#3-unified-cli--verification-commands-scriptsvectra_clipy)
4. [LocalOllama & Container Runbook](#4-localollama--container-runbook)

---

## 1. Workspace, Toolchain & Modularity Mandates
- **Repository**: `https://github.com/lithix-src/vectra.git` (`branch: main`), checked out in WSL (`/home/erik/Projects/vectra`) and Windows (`D:\projects\vectra`).
- **Mandatory File-Size Budget ([`AGENTS.md`](./AGENTS.md))**:
  - Target **<= 350 lines** per authored file; **hard ceiling `420` lines (`350 + 20%`)**, enforced automatically by **Gate 2** in [`scripts/review_gates.py`](./scripts/review_gates.py) and `.git/hooks/pre-commit`.
  - Split growing modules via Python/TS **imports** and connect documentation via relative **Markdown links**.
  - Keep documentation updated in lockstep with every code change; all 5 package `README.md`s must retain `## Table of Contents` (**Gate 1**).
- **Toolchain**:
  - **Python**: Strictly `uv` & `uvx` (`uv run python scripts/vectra_cli.py ...`) — zero `Makefile` or bare `pip`.
  - **Node / Web**: `pnpm` resolved via `_pnpm_cmd()` in [`scripts/vectra_cli.py`](./scripts/vectra_cli.py) with automatic `npx --yes pnpm@10` fallback across Windows & WSL.
  - **Zero GitHub Actions**: 100% local pre-commit verification via `.git/hooks/pre-commit`.

---

## 2. Modular Architecture & Linked Package Map

1. **Multi-Tenant Hybrid Knowledge Graph ([`packages/db/README.md`](./packages/db/README.md))**:
   - [`packages/db/sql/init_extensions_and_rls.sql`](./packages/db/sql/init_extensions_and_rls.sql): `ENABLE` + `FORCE ROW LEVEL SECURITY` across `user_integrations`, `canonical_nodes`, `node_sources`, `associative_edges`, and `consultant_notes`.
   - [`packages/db/vectra_db/scoring.py`](./packages/db/vectra_db/scoring.py): `1536-d` deterministic/projected vectors, `0.84` cosine threshold, `extract_wikilinks()`, and real-time `compute_composite_score()` returning `base_signal_component`, `source_authority_component`, `graph_centrality_component`, `consultant_weight`, and `composite_score`.
   - [`packages/db/vectra_db/vault.py`](./packages/db/vectra_db/vault.py) & [`security.py`](./packages/db/vectra_db/security.py): `AES-256-GCM` KMS envelope encryption + `derive_tenant_kek_hkdf()`.
   - [`packages/db/vectra_db/seed.py`](./packages/db/vectra_db/seed.py): Orchestrates [`seed_nodes_core.py`](./packages/db/vectra_db/seed_nodes_core.py), [`seed_nodes_verticals.py`](./packages/db/vectra_db/seed_nodes_verticals.py), and [`seed_relations.py`](./packages/db/vectra_db/seed_relations.py).

2. **Sovereign Local LLM & Zero-Trust MCP API ([`apps/api/README.md`](./apps/api/README.md))**:
   - [`apps/api/llm_policy.py`](./apps/api/llm_policy.py) & [`llm_runtime.py`](./apps/api/llm_runtime.py): `ollama` default (`http://localhost:11434`, `qwen2.5:14b-instruct` + `nomic-embed-text` -> `1536-d`), plus `litellm_proxy`, `vllm`, `llamacpp`, `lmstudio`; blocks all commercial cloud hosts/models (`gpt-*`, `claude-*`, `gemini-*`, `o1-*`, `o3-*`, `o4-*`).
   - [`apps/api/mcp_catalog.py`](./apps/api/mcp_catalog.py), [`mcp_jsonrpc.py`](./apps/api/mcp_jsonrpc.py), [`mcp_gateway.py`](./apps/api/mcp_gateway.py) & [`mcp_tools.py`](./apps/api/mcp_tools.py): 4 internal MCP servers, 9 RLS-scoped tools, HMAC-SHA256 `MCPMediatedEnvelope`, forbidden KMS/SQL blocking, and secret redaction.
   - [`apps/api/main.py`](./apps/api/main.py), [`schemas.py`](./apps/api/schemas.py), [`graph_service.py`](./apps/api/graph_service.py), [`routes_ingest_auth.py`](./apps/api/routes_ingest_auth.py) & [`routes_copilot_deliverables.py`](./apps/api/routes_copilot_deliverables.py): Modular FastAPI routers with sanitized 3-tier RLS openCypher generation and dynamic `intel+<user>@` webhook parsing.

3. **Temporal Workers & Collector Pack Scheduler ([`apps/workers/README.md`](./apps/workers/README.md))**:
   - [`apps/workers/worker.py`](./apps/workers/worker.py): Idempotent `NodeSource` deduplication in `cluster_and_attach_source_activity()` and dual Temporal/in-process execution in `MultiTierIngestionWorkflow`.
   - [`apps/workers/tasks.py`](./apps/workers/tasks.py): Curated & live RSS 2.0 / Atom / SEC EDGAR collector scheduler (`f500_ai_capex`, `sec_edgar_8k`, `nist_eu_ai_act`).

4. **Modular 3-Pane UI, Context Expression Matcher & Data Association Navigator ([`apps/web/README.md`](./apps/web/README.md))**:
   - [`apps/web/src/app/page.tsx`](./apps/web/src/app/page.tsx) composes [`useVectraWorkspace.ts`](./apps/web/src/hooks/useVectraWorkspace.ts), [`useVectraRuntimeActions.ts`](./apps/web/src/hooks/useVectraRuntimeActions.ts), [`contextMatcher.ts`](./apps/web/src/lib/contextMatcher.ts), [`WorkspaceHeader.tsx`](./apps/web/src/components/WorkspaceHeader.tsx), [`LeftRailSnapView.tsx`](./apps/web/src/components/LeftRailSnapView.tsx), [`CenterWorkspacePane.tsx`](./apps/web/src/components/CenterWorkspacePane.tsx), [`RightRailInspector.tsx`](./apps/web/src/components/RightRailInspector.tsx), [`ContextMatchBanner.tsx`](./apps/web/src/components/ContextMatchBanner.tsx), [`AssociationNavigator.tsx`](./apps/web/src/components/AssociationNavigator.tsx), and `src/components/modals/*` (enforcing all 15 Gate-5 DOM Test-IDs).

---

## 3. Unified CLI & Verification Commands (`scripts/vectra_cli.py`)

```bash
# 1. Sync latest verified state from origin/main
git pull --ff-only origin main

# 2. Full zero-to-verified instantiation (.env, .venv, node_modules, 6-Gate Review + 14-Stage E2E)
uv run python scripts/vectra_cli.py instantiate

# 3. Run 6-Gate Modularity, Architecture & Security Audit + 14-Stage E2E Suite
uv run python scripts/vectra_cli.py review

# 4. Launch FastAPI + Next.js 15 concurrently (auto-detects free port if :3000/:8000 is occupied)
uv run python scripts/vectra_cli.py dev

# 5. Clean transient caches and reset local SQLite fallback DB
uv run python scripts/vectra_cli.py clean --reset-db
```

---

## 4. Local Ollama & Container Runbook

- **Ollama Live Synthesis & `1536-d` Projection**:
  - Pull default models (`ollama pull qwen2.5:14b-instruct` and `ollama pull nomic-embed-text`) or select any discovered local Ollama model directly in `#local-llm-config-modal`.
  - Verify `execution_mode: "local_embedding_model"` (`POST /api/llm/embed`) and `execution_mode: "local_llm"` (`POST /api/copilot/query`).
- **Rancher Desktop Containers (`infra-up`)**:
  - In WSL, ensure your user belongs to the `docker` socket group (`sudo usermod -aG docker $USER`), then run `uv run python scripts/vectra_cli.py infra-up` to start PostgreSQL 17 (`pgvector` + Apache AGE), Redis 7, Temporal, Ollama, and LiteLLM Local Proxy.
