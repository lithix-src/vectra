# `vectra-db` — Multi-Tenant Database, RLS, KMS Vault & Scoring Package (`/packages/db`)

`vectra-db` provides the persistence, security, and mathematical scoring foundation for **VECTRA**. It supports **PostgreSQL 17** (`pgvector` + `Apache AGE` + `ENABLE` & `FORCE` Row-Level Security) in containers and an automatic **async SQLite** fallback (`vectra_intel.db`) with SQLAlchemy RLS parity (`rls_visibility_filter()`). All modules adhere to the `<= 350 + 20%` (`420` LOC) modularity standard in [`../../AGENTS.md`](../../AGENTS.md).

---

## Table of Contents
1. [Modular File Map & Key Responsibilities](#1-modular-file-map--key-responsibilities)
2. [Database Schema & 5 Core Tables](#2-database-schema--5-core-tables)
3. [Multi-Tenant Row-Level Security (RLS) Isolation](#3-multi-tenant-row-level-security-rls-isolation)
4. [AES-256-GCM KMS Envelope Vault & HKDF-SHA256](#4-aes-256-gcm-kms-envelope-vault--hkdf-sha256)
5. [Canonical Embedding, Cosine Clustering & Composite Score Math](#5-canonical-embedding-cosine-clustering--composite-score-math)
6. [Verification Commands (`uv`)](#6-verification-commands-uv)

---

## 1. Modular File Map & Key Responsibilities

| File | Key Symbols | Purpose |
| :--- | :--- | :--- |
| [`sql/init_extensions_and_rls.sql`](./sql/init_extensions_and_rls.sql) | `ENABLE` + `FORCE ROW LEVEL SECURITY` | PostgreSQL 17 DDL enabling `uuid-ossp`, `vector`, and `age`, plus all 5 tables and RLS policies. |
| [`vectra_db/models.py`](./vectra_db/models.py) | `UserIntegration`, `CanonicalNode`, `NodeSource`, `AssociativeEdge`, `ConsultantNote` | SQLAlchemy 2.0 `DeclarativeBase` async ORM models. |
| [`vectra_db/session.py`](./vectra_db/session.py) | `TenantContext`, `tenant_session`, `rls_visibility_filter` | Async engine/session manager setting `app.current_user_id` & `app.current_org_id` + SQLite RLS filter. |
| [`vectra_db/vault.py`](./vectra_db/vault.py) | `KMSEnvelopeVault`, `EncryptedEnvelope` | `AES-256-GCM` envelope encryption with per-record wrapped 256-bit DEKs (worker-only decrypt). |
| [`vectra_db/security.py`](./vectra_db/security.py) | `derive_tenant_kek_hkdf()` | Deterministic per-tenant 256-bit KEK derivation via `HKDF-SHA256`. |
| [`vectra_db/scoring.py`](./vectra_db/scoring.py) | `deterministic_embedding_1536`, `cosine_similarity`, `compute_composite_score`, `extract_wikilinks` | `1536-d` vector projection, cosine clustering (`> 0.84`), real-time composite scoring (`base_signal_component` + `S_auth` + `G_centrality`), and `[[Wikilink]]` parser. |
| [`vectra_db/seed.py`](./vectra_db/seed.py) | `seed_database()` | Orchestrates modular fixtures from [`seed_nodes_core.py`](./vectra_db/seed_nodes_core.py), [`seed_nodes_verticals.py`](./vectra_db/seed_nodes_verticals.py), and [`seed_relations.py`](./vectra_db/seed_relations.py). |
| [`verify_vectra_stack.py`](./verify_vectra_stack.py) | `run_verification()` | **14-stage** end-to-end verification suite covering RLS, KMS/HKDF, scoring, `[[Wikilinks]]`, webhooks, collectors, `.pptx`/`.md`, Local LLM, and Zero-Trust MCP. |

---

## 2. Database Schema & 5 Core Tables

See the full ERD in [`../../ARCHITECTURE_AND_ERD.md`](../../ARCHITECTURE_AND_ERD.md):
1. `user_integrations`: `AES-256-GCM` KMS-wrapped tokens/cookies (`x_oauth2`, `inbound_email`, `substack_session`, `github`).
2. `canonical_nodes`: 14-day intelligence nodes with `C-Suite`, `CTO`, and `Contrarian` summaries, Variant Diff claims, `consultant_weight` (`0.5x–5.0x`), and `VECTOR(1536)` embeddings.
3. `node_sources`: Primary citations (`public` vs. `subscriber_licensed`, `global` | `org_private` | `user_private`).
4. `associative_edges`: Directed typed edges (`ENABLES`, `CONFLICTS_WITH`, `REGULATES`, `CASE_STUDY_OF`, `REPLACES`).
5. `consultant_notes`: Obsidian Markdown notes with `extracted_wikilinks` synced to `associative_edges`.

---

## 3. Multi-Tenant Row-Level Security (RLS) Isolation

Every transaction runs inside `tenant_session(TenantContext(user_id, org_id))`:
- **`global`**: Visible to all tenants.
- **`org_private`**: Visible only when `owner_org_id == app.current_org_id`.
- **`user_private`**: Visible only when `owner_user_id == app.current_user_id` (allowing private `[Subscriber Licensed]` quotes on shared `global` nodes without cross-tenant leakage).

---

## 4. AES-256-GCM KMS Envelope Vault & HKDF-SHA256

- `KMSEnvelopeVault` wraps per-record 256-bit DEKs under a SHA-256 master KEK (`VECTRA_KMS_MASTER_KEY`) with 96-bit GCM nonces and AAD (`"{user_id}:{provider}"`).
- `derive_tenant_kek_hkdf(tenant_id)` derives deterministic tenant-scoped 32-byte keys via `HKDF-SHA256`.
- Plaintext decryption occurs strictly in worker memory (`decrypt_in_worker_memory()` in [`../../apps/workers/worker.py`](../../apps/workers/worker.py)).

---

## 5. Canonical Embedding, Cosine Clustering & Composite Score Math

`compute_composite_score()` in [`vectra_db/scoring.py`](./vectra_db/scoring.py) returns `base_signal_component`, `source_authority_component`, `graph_centrality_component`, `consultant_weight`, and `composite_score`:

$$\text{Composite\_Score}(i) = \operatorname{round}\!\left(\left(0.35 \cdot B_i + \sum_{s \in S_i} \text{Authority}(s) \cdot \exp(-\lambda \Delta t_s) \cdot 9.5 + \sum_{e \in E_i} w_e \cdot \alpha_{\text{rel}}(e)\right) \times \operatorname{clip}(W_i, 0.5, 5.0),\; 1\right)$$

---

## 6. Verification Commands (`uv`)

```bash
uv run python scripts/vectra_cli.py verify
uv run python scripts/vectra_cli.py review
```
