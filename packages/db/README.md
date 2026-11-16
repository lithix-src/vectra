# `vectra-db` — Multi-Tenant Database, RLS, KMS Vault & Scoring Package (`/packages/db`)

`vectra-db` provides the persistence, security, and mathematical scoring foundation for **VECTRA**. It supports **PostgreSQL 17** (`pgvector` + `Apache AGE` + native Row-Level Security) in Docker/production and includes an automatic **async SQLite** fallback (`vectra_intel.db`) with defense-in-depth SQLAlchemy RLS predicates so the stack boots with zero external daemon dependencies when needed.

---

## Table of Contents
1. [Module Map & Key Responsibilities](#1-module-map--key-responsibilities)
2. [Database Schema & Entity Overview](#2-database-schema--entity-overview)
3. [Multi-Tenant Row-Level Security (RLS) Isolation Model](#3-multi-tenant-row-level-security-rls-isolation-model)
4. [AES-256-GCM KMS Envelope Encryption Vault](#4-aes-256-gcm-kms-envelope-encryption-vault)
5. [Canonical Embedding, Cosine Clustering & Composite Score Mathematics](#5-canonical-embedding-cosine-clustering--composite-score-mathematics)
6. [Cross-Platform `uv` & `uvx` Commands](#6-cross-platform-uv--uvx-commands)

---

## 1. Module Map & Key Responsibilities

| File | Key Symbols | Purpose |
| :--- | :--- | :--- |
| [`sql/init_extensions_and_rls.sql`](./sql/init_extensions_and_rls.sql) | `rls_*_isolation`, `vectra_knowledge_graph` | PostgreSQL 17 DDL enabling `uuid-ossp`, `vector` (`pgvector`), and `age` (`Apache AGE`), plus all 5 tables and RLS policies. |
| [`alembic/versions/0001_initial_vectra_schema.py`](./alembic/versions/0001_initial_vectra_schema.py) | `upgrade()`, `downgrade()` | Alembic schema migration executing the full Postgres 17 + RLS initialization. |
| [`vectra_db/models.py`](./vectra_db/models.py) | `UserIntegration`, `CanonicalNode`, `NodeSource`, `AssociativeEdge`, `ConsultantNote` | SQLAlchemy 2.0 `DeclarativeBase` async ORM models. |
| [`vectra_db/vault.py`](./vectra_db/vault.py) | `KMSEnvelopeVault`, `EncryptedEnvelope` | `AES-256-GCM` envelope encryption with per-record wrapped 256-bit DEKs. |
| [`vectra_db/scoring.py`](./vectra_db/scoring.py) | `deterministic_embedding_1536`, `cosine_similarity`, `compute_composite_score`, `extract_wikilinks` | 1536-dim semantic vector projection, cosine clustering (`> 0.84`), real-time composite scoring, and `[[wikilink]]` parser. |
| [`vectra_db/session.py`](./vectra_db/session.py) | `TenantContext`, `tenant_session`, `rls_visibility_filter` | Async SQLAlchemy engine manager setting `app.current_user_id` & `app.current_org_id` session variables. |
| [`vectra_db/seed.py`](./vectra_db/seed.py) | `seed_database()` | Multi-industry enterprise AI intelligence dataset + foreign-tenant test records for RLS verification. |
| [`verify_vectra_stack.py`](./verify_vectra_stack.py) | `run_verification()` | 8-stage automated verification suite testing RLS, KMS vault, scoring, wikilinks, webhooks, Co-Pilot, and `.pptx` generation. |

---

## 2. Database Schema & Entity Overview

1. **`user_integrations`**:
   - Stores encrypted credentials (`encrypted_dek`, `encryption_iv`, `ciphertext`, `auth_tag`) for `x_oauth2`, `inbound_email`, `substack_session`, and `github`.
2. **`canonical_nodes`**:
   - Clustered 14-day intelligence events containing `title`, `summary_executive` (C-Suite), `summary_technical` (CTO), `summary_contrarian` (Skeptic), `claim_vendor`, `claim_builder`, `claim_production`, `industry_verticals[]`, `maturity_stage`, `base_signal_score`, `consultant_weight` (`0.5x–5.0x`), `visibility`, and `embedding VECTOR(1536)`.
3. **`node_sources`**:
   - Primary evidence citations attached `1:N` to `canonical_nodes` (`source_type`, `source_name`, `author_handle`, `authority_tier` 1–3, `direct_url`, `exact_quote`, `provenance_license` [`public` | `subscriber_licensed`], `visibility`, `owner_user_id`).
4. **`associative_edges`**:
   - Directed weighted edges (`ENABLES`, `CONFLICTS_WITH`, `REGULATES`, `CASE_STUDY_OF`, `REPLACES`) with `weight`, `is_user_created`, and `consultant_note`.
5. **`consultant_notes`**:
   - Per-node Obsidian Markdown notes with `extracted_wikilinks[]` that auto-upsert rows into `associative_edges` on save.

---

## 3. Multi-Tenant Row-Level Security (RLS) Isolation Model

Every database transaction is scoped to a `TenantContext(user_id, org_id)`:
- **`global`**: Visible to all authenticated tenants (e.g., public SEC filings, Fortune 500 engineering blog posts).
- **`org_private`**: Visible only when `owner_org_id == app.current_org_id` (e.g., VECTRA Advisory internal benchmarks).
- **`user_private`**: Visible only when `owner_user_id == app.current_user_id` (e.g., Erik's paid newsletter excerpts from `intel+erik@ingest.vectra.ai`, private X Bookmarks, and personal field notes).

This allows Erik's `user_private` (`subscriber_licensed`) citations to merge onto shared `global` Canonical Nodes in his view without ever leaking private quotes to other tenants.

---

## 4. AES-256-GCM KMS Envelope Encryption Vault

`KMSEnvelopeVault` in [`vectra_db/vault.py`](./vectra_db/vault.py) implements two-tier envelope encryption:
1. A 256-bit **Key Encryption Key (KEK)** is derived from `VECTRA_KMS_MASTER_KEY`.
2. Each row in `user_integrations` generates a fresh random 256-bit **Data Encryption Key (DEK)**.
3. The credential payload is encrypted with the DEK using `AES-256-GCM` (12-byte nonce + 16-byte authentication tag), and the DEK is wrapped by the KEK with Additional Authenticated Data (`aad_context = "{user_id}:{provider}"`).
4. Only Temporal worker activities call `decrypt_in_worker_memory()`.

---

## 5. Canonical Embedding, Cosine Clustering & Composite Score Mathematics

$$\text{Composite\_Score}(i) = \left( \sum_{s \in S_i} \left(\text{Authority\_Multiplier}(s) \times \exp(-\lambda \Delta t_s) \times 9.5\right) + \sum_{e \in E_i} w_e \cdot \alpha_{\text{rel}}(e) + 0.35 \cdot B_i \right) \times \text{Consultant\_Weight}_i$$

- **Authority Multipliers**: Tier 1 = `3.0`, Tier 2 = `2.1`, Tier 3 = `1.2`.
- **Recency Decay**: Exponential half-life over the 14-day canonical clustering window.
- **Consultant Weight**: User-adjustable slider (`0.5x` to `5.0x`).

---

## 6. Cross-Platform `uv` & `uvx` Commands

Run from the monorepo root in Windows PowerShell, macOS, or Linux:

```powershell
# Install vectra-db in editable mode
uv pip install --python .venv -e packages/db

# Run the automated 8-stage verification suite
uv run python packages/db/verify_vectra_stack.py
```
