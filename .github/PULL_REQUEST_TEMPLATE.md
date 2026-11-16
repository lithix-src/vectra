# Pull Request — VECTRA Architecture & Code Review Checklist

## 1. Summary of Changes
- **Subsystem(s) Modified**: `[ ] packages/db` | `[ ] apps/api` | `[ ] apps/workers` | `[ ] apps/web` | `[ ] scripts/deploy`
- **Executive Summary**:

---

## 2. Mandatory Team Review Gates (Run `uv run python scripts/vectra_cli.py review`)
- [ ] **Gate 1 — Documentation & ToC Standard**: Updated corresponding package `README.md` and preserved `## Table of Contents` structure.
- [ ] **Gate 2 — Multi-Tenant Row-Level Security (RLS)**: Any new table or query enforces `global`, `org_private`, and `user_private` tenant isolation (`rls_visibility_filter` + Postgres RLS DDL).
- [ ] **Gate 3 — KMS Decryption Boundary**: Encrypted credentials (`user_integrations`) are never decrypted in `/apps/api` routes; decryption occurs strictly in-memory inside `/apps/workers`.
- [ ] **Gate 4 — Toolchain Standard**: Uses cross-platform `uv`/`uvx` (latest standard CPython), `pnpm`, and Rancher Desktop (`nerdctl compose` / `moby`)—no `Makefile` or OS-locked scripts.
- [ ] **Gate 5 — Automated Verification**: `uv run python scripts/vectra_cli.py review` passes all 5 gates and all `8/8` end-to-end functional assertions.
