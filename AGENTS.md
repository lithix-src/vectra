# VECTRA — Mandatory Development, Modularity & Documentation Rules (`AGENTS.md`)

All human engineers and AI coding agents working in **VECTRA** MUST enforce these attributes on every task and commit:

## 1. Strict Modular File-Size Budget (`350 + 20%` = `420` Lines Max)
- **Target Budget**: Keep every authored source, schema, configuration, and documentation file **<= 350 lines**.
- **Hard Ceiling**: **No authored file may exceed `420` lines (`350 + 20%`)**. This is programmatically enforced by **Gate 2** of [`scripts/review_gates.py`](./scripts/review_gates.py) during `uv run python scripts/vectra_cli.py review` and `.git/hooks/pre-commit`.
- **Composition Mechanism**: Whenever a module approaches 350 lines, decompose it using the idiomatic mechanism for that file type:
  - **Python (`.py`)**: Extract cohesive domain modules (`schemas.py`, `graph_service.py`, `llm_policy.py`, `mcp_catalog.py`, `mcp_jsonrpc.py`, `seed_*.py`) and connect via explicit **imports** and `__all__` re-exports.
  - **TypeScript / React (`.ts`, `.tsx`)**: Extract strongly typed hooks (`src/hooks/*`), constants (`src/lib/*`), and presentational/modal components (`src/components/*`), connecting via ES module **imports**.
  - **Markdown Documentation (`.md`)**: Keep documents concise and connect related specifications via relative **Markdown links / references** rather than duplicating prose.

## 2. Live Documentation Synchronization
- Any change to routes, schemas, UI components, CLI gates, scoring formulas, or security boundaries **must** update the corresponding documentation in the same change:
  - Root index & quickstart: [`README.md`](./README.md) and [`HANDOFF.md`](./HANDOFF.md)
  - Architecture & review gates: [`ARCHITECTURE_AND_ERD.md`](./ARCHITECTURE_AND_ERD.md), [`DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md`](./DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md), and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)
  - Package docs (all 5 must retain `## Table of Contents`, enforced by **Gate 1**):
    - [`packages/db/README.md`](./packages/db/README.md)
    - [`apps/api/README.md`](./apps/api/README.md)
    - [`apps/workers/README.md`](./apps/workers/README.md)
    - [`apps/web/README.md`](./apps/web/README.md)

## 3. Non-Negotiable Security & Toolchain Invariants
- **Zero GitHub Actions (`0% Cloud CI`)**: GitHub Actions is strictly disabled on the repository (`enabled=false`) and `.github/workflows/` is forbidden (enforced by **Gate 1** of [`scripts/review_gates.py`](./scripts/review_gates.py) and `.gitignore`). All verification runs 100% locally via `.git/hooks/pre-commit` and `uv run python scripts/vectra_cli.py review`.
- **Toolchain**: Strictly `uv` / `uvx` (`uv run python scripts/vectra_cli.py ...`) and `pnpm` (`_pnpm_cmd()` fallback to `npx --yes pnpm@10`). Zero `Makefile` or global `pip`.
- **Multi-Tenant RLS & KMS Boundary**: All 5 tables enforce `ENABLE` + `FORCE ROW LEVEL SECURITY` (`global` | `org_private` | `user_private`). Raw credentials in `user_integrations` are decrypted **only** inside worker memory (`KMSEnvelopeVault.decrypt_in_worker_memory()`).
- **Sovereign Local LLM & Zero-Trust MCP Mediation**: `VECTRA_BLOCK_COMMERCIAL_LLMS=true` blocks all commercial cloud LLM hosts/models (`llm_policy.py`). All RAG model context must carry an HMAC-signed `MCPMediatedEnvelope` (`mcp_gateway.py`).
- **Pre-Commit Verification**: Always run `uv run python scripts/vectra_cli.py review` and confirm all **6 Review Gates** and **14 E2E Checks** pass before committing.
