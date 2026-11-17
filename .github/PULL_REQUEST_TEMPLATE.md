# Pull Request — VECTRA Architecture, Modularity & Security Checklist

## 1. Summary of Changes
- **Subsystem(s) Modified**: `[ ] packages/db` | `[ ] apps/api` | `[ ] apps/workers` | `[ ] apps/web` | `[ ] scripts/docs`
- **Executive Summary**:

---

## 2. Mandatory Development Gates (`uv run python scripts/vectra_cli.py review`)
- [ ] **Gate 1 — Documentation, ToC, `AGENTS.md` & Zero GitHub Actions**: Updated affected docs in lockstep with code changes, preserved `## Table of Contents` across all 5 package READMEs, and verified `.github/workflows/` remains absent (`enabled=false` on GitHub).
- [ ] **Gate 2 — Modular File-Size Budget (`<= 350 + 20% = 420` LOC)**: No authored file exceeds 420 lines (target <= 350 lines), decomposing via imports, links, or references as appropriate.
- [ ] **Gate 3 — Multi-Tenant Row-Level Security (RLS) & KMS Boundary**: Enforces `ENABLE` + `FORCE ROW LEVEL SECURITY` across all 5 tables; `user_integrations` secrets decrypt strictly inside worker memory.
- [ ] **Gate 4 — Toolchain & Python Bytecode Audit**: Uses cross-platform `uv`/`uvx`, `pnpm`, and Rancher Desktop (`nerdctl compose` / `docker compose`) with zero `Makefile` dependency.
- [ ] **Gate 5 — UI DOM Test-ID Contract & Strict TypeScript (`tsc --noEmit`)**: All 11 required UI DOM anchors exist across `apps/web/src/**/*.tsx` and `tsc --noEmit` passes with zero errors.
- [ ] **Gate 6 — 14-Stage End-to-End Verification**: `uv run python scripts/vectra_cli.py review` passes all 6 Review Gates and all `14/14` functional, Sovereign Local LLM, and Zero-Trust MCP checks.
