# `vectra-workers` — Temporal.io Ingestion, KMS Rotation & Collector Scheduler (`/apps/workers`)

`vectra-workers` implements the Temporal.io workflows, worker-memory KMS decryption boundary, idempotent 14-day semantic clustering, and the RSS 2.0 / Atom / SEC EDGAR collector pack scheduler. All modules adhere to the `<= 350 + 20%` (`420` LOC) standard in [`../../AGENTS.md`](../../AGENTS.md).

---

## Table of Contents
1. [Module Map & Security Boundary](#1-module-map--security-boundary)
2. [Workflows, Activities & Scheduler Reference](#2-workflows-activities--scheduler-reference)
3. [Curated & Live Collector Packs (`tasks.py`)](#3-curated--live-collector-packs-taskspy)
4. [Idempotent 14-Day Canonical Clustering (`cosine > 0.84`)](#4-idempotent-14-day-canonical-clustering-cosine--084)
5. [Running Locally (`uv`)](#5-running-locally-uv)

---

## 1. Module Map & Security Boundary

| File | Key Symbols | Responsibility |
| :--- | :--- | :--- |
| [`worker.py`](./worker.py) | `MultiTierIngestionWorkflow`, `refresh_x_oauth2_tokens_activity`, `cluster_and_attach_source_activity`, `collect_public_enterprise_feeds_activity` | Temporal worker fleet (`vectra-intelligence-queue`), worker-only `AES-256-GCM` KMS decryption, and idempotent semantic clustering. |
| [`tasks.py`](./tasks.py) | `CURATED_COLLECTOR_PACKS`, `parse_rss_or_atom_xml`, `run_collector_pack`, `get_collector_schedule_status`, `configure_collector_schedule` | Curated + live HTTP RSS 2.0 / Atom / SEC EDGAR feed parser (`SEC_EDGAR_USER_AGENT`) and configurable worker polling registry. |

- **Strict KMS Decryption Boundary**: `user_integrations` credentials sealed by [`KMSEnvelopeVault`](../../packages/db/vectra_db/vault.py) are decrypted **only** inside worker memory (`decrypt_in_worker_memory()`).
- **Dual Execution Mode**: `MultiTierIngestionWorkflow.run()` uses `workflow.execute_activity(...)` when running inside a live Temporal server sandbox and falls back cleanly to direct async execution in containerless tests.

---

## 2. Workflows, Activities & Scheduler Reference

| Symbol | Module | Purpose |
| :--- | :--- | :--- |
| `MultiTierIngestionWorkflow` | [`worker.py`](./worker.py) | Orchestrates OAuth token rotation followed by public & regulatory feed collection. |
| `refresh_x_oauth2_tokens_activity` | [`worker.py`](./worker.py) | Decrypts `x_oauth2` tokens in memory, rotates access tokens, and re-seals the `AES-256-GCM` envelope. |
| `cluster_and_attach_source_activity` | [`worker.py`](./worker.py) | Embeds incoming signals (`1536-d`), clusters at `cosine >= 0.84`, and idempotently upserts `NodeSource` citations. |
| `run_collector_pack` | [`tasks.py`](./tasks.py) | Runs one or all collector packs (`allow_live_http` optional) with deterministic curated fallback. |
| `configure_collector_schedule` | [`tasks.py`](./tasks.py) | Updates polling intervals (`5–1440` minutes) and `enabled` flags exposed via `/api/collectors/schedule` in [`routes_ingest_auth.py`](../../apps/api/routes_ingest_auth.py). |

---

## 3. Curated & Live Collector Packs (`tasks.py`)

1. **`f500_ai_capex`**: Fortune 500 Engineering & AI CapEx Telemetry (Netflix, Stripe engineering feeds).
2. **`sec_edgar_8k`**: SEC EDGAR Form 10-K / 8-K AI Operational Disclosures (compliant `SEC_EDGAR_USER_AGENT`).
3. **`nist_eu_ai_act`**: NIST AI RMF / EU AI Act Annex IV / OCC SR 11-7 regulatory feeds.

---

## 4. Idempotent 14-Day Canonical Clustering (`cosine > 0.84`)

1. Computes normalized `1536-d` vector via [`scoring.py`](../../packages/db/vectra_db/scoring.py).
2. Matches active 14-day `CanonicalNode` rows (`cosine >= 0.84` or domain title overlap) within the caller's `TenantContext` RLS scope.
3. Deduplicates `(node_id, exact_quote, owner_user_id, visibility)` on `NodeSource` so repeated scheduled runs refresh `published_at` without duplicating citations.

---

## 5. Running Locally (`uv`)

```bash
uv run python scripts/vectra_cli.py worker
```
