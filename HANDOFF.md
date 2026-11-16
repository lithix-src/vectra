# VECTRA — Enterprise AI Transformation & Executive Advisory OS (Local Development Handoff)

## Table of Contents
1. [Local Environment & Toolchain Mandates (`mother-brain`)](#1-local-environment--toolchain-mandates-mother-brain)
2. [Core Architectural Pillars](#2-core-architectural-pillars)
3. [Unified CLI (`scripts/vectra_cli.py`)](#3-unified-cli-scriptsvectra_clipy)
4. [On-Disk Delivery & Sync Commands for `D:\projects\vectra`](#4-on-disk-delivery--sync-commands-for-dprojectsvectra)

---

## 1. Local Environment & Toolchain Mandates (`mother-brain`)
- **Canonical Workspace**: `D:\projects\vectra` (GitHub remote: `https://github.com/lithix-src/vectra.git`, branch `main`).
- **Windows Toolchain**:
  - **Scoop** (`~\scoop\shims`) manages CLI tooling (`git`, `gh`, `uv`, `nodejs-lts`, `pnpm`, `ollama`, `rancher-desktop`).
  - **Rancher Desktop** (`nerdctl compose` or `dockerd` / `moby` runtime) provides local container orchestration ([`docker-compose.yml`](./docker-compose.yml) and [`infra/docker/docker-compose.yml`](./infra/docker/docker-compose.yml): PostgreSQL 17 + `pgvector` + Apache AGE on `:5432`, Redis 7 on `:6379`, Temporal on `:7233`, Ollama on `:11434`, LiteLLM Local Proxy on `:4000`).
  - **`uv` / `uvx` Python Management**: All Python virtual environments (`.venv`), dependencies, and executions are managed strictly via `uv` and `uvx` targeting the latest standard CPython (`uv run python ...`). Never invoke bare `pip` or global `python`.
- **Zero GitHub Actions / 100% Local Pre-Commit Verification**:
  - GitHub Actions is intentionally disabled and removed.
  - Every commit is gated locally by `.git/hooks/pre-commit` (installed automatically by [`scripts/vectra_cli.py`](./scripts/vectra_cli.py)), which executes `uv run python scripts/vectra_cli.py review`.
  - All package `README.md` files must maintain a `## Table of Contents` header (enforced by Gate 1).

---

## 2. Core Architectural Pillars
1. **Multi-Tenant Hybrid Knowledge Graph ([`packages/db/vectra_db/`](./packages/db/vectra_db))**:
   - **PostgreSQL 17** with strict Row-Level Security (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` in [`packages/db/sql/init_extensions_and_rls.sql`](./packages/db/sql/init_extensions_and_rls.sql)) across all 5 core tables (`user_integrations`, `canonical_nodes`, `node_sources`, `associative_edges`, `consultant_notes`), plus automatic zero-config SQLite fallback (`vectra_intel.db`) when containers are offline.
   - **pgvector (`1536-d`)** for semantic entity deduplication ([`packages/db/vectra_db/scoring.py`](./packages/db/vectra_db/scoring.py)).
   - **Apache AGE (`openCypher`)** for multi-hop graph traversal (`vectra_knowledge_graph`).
   - **Dynamic Composite Scoring ([`packages/db/vectra_db/scoring.py`](./packages/db/vectra_db/scoring.py))**:
     Supports interactive slider multipliers (`0.5x–5.0x`) without mutating immutable ingestion scores.
   - **AES-256-GCM Envelope KMS Vault ([`packages/db/vectra_db/vault.py`](./packages/db/vectra_db/vault.py) & [`packages/db/vectra_db/security.py`](./packages/db/vectra_db/security.py))**:
     Per-tenant HKDF-SHA256 derived keys (`derive_tenant_kek_hkdf`) and 96-bit (12-byte) GCM nonces encrypting integration credentials (`KMSEnvelopeVault`).

2. **Sovereign Local-First LLM & Embeddings Engine ([`apps/api/llm_runtime.py`](./apps/api/llm_runtime.py) & [`litellm_config.yaml`](./litellm_config.yaml))**:
   - **Zero Commercial Cloud Dependency**: Defaults to **Ollama** (`VECTRA_LLM_PROVIDER=ollama`, `http://localhost:11434`, chat model `qwen2.5:14b-instruct`, embedding model `nomic-embed-text` deterministically projected and L2-normalized to `1536-d`).
   - Also supports local `litellm_proxy` (`http://localhost:4000`), `vllm`, `llamacpp`, and `lmstudio`.
   - **Commercial Cloud Guardrail**: `VECTRA_BLOCK_COMMERCIAL_LLMS=true` (default) actively inspects both provider/model names and target URLs (`api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, `api.cohere.ai`, `api.mistral.ai`) and raises `SovereignPolicyViolationError` / `CommercialModelPolicyError` if any commercial cloud endpoint is configured.

3. **Zero-Trust Model Context Protocol (MCP) Gateway ([`apps/api/mcp_gateway.py`](./apps/api/mcp_gateway.py))**:
   - **No Direct Model Access**: Models (`generate_local_rag_synthesis` in [`apps/api/llm_runtime.py`](./apps/api/llm_runtime.py)) are strictly prohibited from querying PostgreSQL/SQLite, reading `user_integrations` / AES-256-GCM KMS secrets, or calling backend services directly.
   - **HMAC-Signed `MCPMediatedEnvelope`**: `generate_local_rag_synthesis` requires a valid `MCPMediatedEnvelope` minted by `MCPZeroTrustGateway.build_rag_mcp_envelope()` (or `create_rag_envelope()`) and verifies its HMAC-SHA256 signature (`MCPGatewaySecurityError` / `MCPPolicyViolationError` raised on missing/tampered envelopes).
   - **Policy-Enforced Internal MCP Servers & Tools**:
     1. `vectra-graph-mcp` (`vectra_get_rls_subgraph`, `vectra_inspect_cypher`)
     2. `vectra-citations-mcp` (`vectra_get_verified_citations`)
     3. `vectra-notes-mcp` (`vectra_get_consultant_notes`, `vectra_preview_wikilink_edges`)
     4. `vectra-embeddings-mcp` (`vectra_compute_local_embedding`, `vectra_list_curated_packs`, `vectra_prepare_deliverable_manifest`)
   - **Forbidden Column/Pattern Scrubbing & Redaction**: Automatically blocks SQL/Cypher referencing `user_integrations`, `tenant_integrations`, `encrypted_dek`, `ciphertext`, or `kms_key_id`, and redacts `sk-*`, `Bearer`, and `AES256GCM:` patterns from tool payloads.
   - **JSON-RPC 2.0 Endpoint**: `POST /api/mcp/rpc` (`initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`), plus `GET /api/mcp/status` and `POST /api/mcp/policy`.

4. **Executive Split-Screen Workbench ([`apps/web/src/app/page.tsx`](./apps/web/src/app/page.tsx))**:
   - Next.js 15 App Router (`http://localhost:3000`) proxying `/api/*` to FastAPI (`http://localhost:8000`).
   - Verified interactive modals and panels (enforced by Gate 4 DOM Test-ID contract):
     - Sovereign Local LLM Runtime Configurator (`#open-local-llm-modal-btn`, `#local-llm-config-modal`)
     - Zero-Trust MCP Gateway Inspector & Live JSON-RPC 2.0 Tool Tester (`#open-mcp-gateway-modal-btn`, `#mcp-gateway-modal`)
     - Public Enterprise Collectors (`#run-public-collectors-btn`: Fortune 500 AI CapEx, SEC EDGAR 8-K, NIST AI RMF)
     - Custom Field Signal Ingestion (`#open-ingest-signal-modal-btn`, `#ingest-signal-modal`)
     - Tenant KMS Credential Vault (`#connected-sources-auth-drawer`)
     - Force-Directed Graph / Ranked Matrix view toggle, live Weighting Sliders, Obsidian `[[Wikilink]]` Field Notes editor, Subgraph RAG Co-Pilot (`#subgraph-copilot-panel`), Boardroom Mode (`#launch-boardroom-mode-btn`), and Executive `.pptx` / `.md` Deliverable exporters.

---

## 3. Unified CLI (`scripts/vectra_cli.py`)
- `uv run python scripts/vectra_cli.py instantiate` — Full local setup (provisions `.venv`, installs dependencies, runs all 5 gates + 14 E2E checks).
- `uv run python scripts/vectra_cli.py dev` — Starts both FastAPI (`:8000`) and Next.js 15 (`:3000`) concurrently in a single terminal.
- `uv run python scripts/vectra_cli.py review` — Runs the 5-Gate Architecture & Security Audit + 14-Stage End-to-End Verification Suite:
  - Gate 1: Package `README.md` Table of Contents verification across all 5 packages.
  - Gate 2: PostgreSQL 17 RLS policy verification across all 5 tables.
  - Gate 3: Python bytecode & syntax compilation (`compileall`).
  - Gate 4: Next.js 15 TypeScript (`tsc --noEmit`) + 9 UI Component DOM Test-ID contracts.
  - Gate 5: 14-Stage End-to-End functional, cryptographic, Sovereign Local LLM, and Zero-Trust MCP verification ([`packages/db/verify_vectra_stack.py`](./packages/db/verify_vectra_stack.py)).
- `uv run python scripts/vectra_cli.py clean --reset-db` — Purges transient caches and resets local `vectra_intel.db`.

---

## 4. On-Disk Delivery & Sync Commands for `D:\projects\vectra`

Run the following PowerShell block on `mother-brain` to sync `D:\projects\vectra` with `origin/main` and verify all 5 gates and 14 E2E checks on disk:

```powershell
# 1. Clone or fast-forward D:\projects\vectra from origin/main
if (-not (Test-Path "D:\projects\vectra\.git")) {
    New-Item -ItemType Directory -Force -Path "D:\projects" | Out-Null
    git clone https://github.com/lithix-src/vectra.git "D:\projects\vectra"
}
Set-Location "D:\projects\vectra"
git fetch origin main
git checkout main
git pull --ff-only origin main

# 2. Run zero-to-verified instantiation (installs CPython 3.15+, .venv, pre-commit hook, and runs 5-Gate + 14-Stage review)
uv run python scripts/vectra_cli.py instantiate

# 3. Launch FastAPI (:8000) + Next.js 15 (:3000) concurrently
uv run python scripts/vectra_cli.py dev
```
