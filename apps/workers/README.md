# `vectra-workers` — Temporal.io Ingestion, OAuth Rotation & Clustering Fleet (`/apps/workers`)

`vectra-workers` contains the Temporal.io workflows and activities responsible for scheduled multi-tier intelligence collection, in-memory KMS credential decryption, OAuth 2.0 PKCE token refresh, and 14-day canonical semantic clustering.

---

## Table of Contents
1. [Architecture & Security Boundary](#1-architecture--security-boundary)
2. [Workflows & Activities Reference](#2-workflows--activities-reference)
3. [Multi-Tier Ingestion Pipeline](#3-multi-tier-ingestion-pipeline)
4. [14-Day Canonical Clustering Logic (`cosine > 0.84`)](#4-14-day-canonical-clustering-logic-cosine--084)
5. [Cross-Platform `uv` & `uvx` Commands](#5-cross-platform-uv--uvx-commands)

---

## 1. Architecture & Security Boundary

- **Strict Decryption Boundary**: Encrypted credentials stored in `user_integrations` (`AES-256-GCM` envelope encryption) are decrypted **only** inside worker memory (`KMSEnvelopeVault.decrypt_in_worker_memory()`) during active token rotation or authenticated scraping.
- **Dual-Execution Capability**: Activities in [`worker.py`](./worker.py) can execute both via a connected Temporal Server cluster (`task_queue="vectra-intelligence-queue"`) and in-process when invoked by FastAPI webhooks or verification suites in containerless environments.

---

## 2. Workflows & Activities Reference

| Symbol | Type | Purpose |
| :--- | :--- | :--- |
| `MultiTierIngestionWorkflow` | `@workflow.defn` | Orchestrates scheduled OAuth token refresh followed by multi-tier public & authenticated collection. |
| `refresh_x_oauth2_tokens_activity` | `@activity.defn` | Decrypts Erik's `x_oauth2` refresh token in memory, rotates the token pair, and re-seals the `AES-256-GCM` envelope. |
| `cluster_and_attach_source_activity` | `@activity.defn` | Embeds incoming intelligence (`1536-d`), computes cosine similarity against active 14-day Canonical Nodes, and attaches the source citation with RLS visibility. |
| `collect_public_enterprise_feeds_activity` | `@activity.defn` | Collects Fortune 500 engineering blogs (Netflix, Stripe, Airbnb), SEC EDGAR `8-K`/`10-K` filings, and NIST AI RMF / EU AI Act / FDA feeds. |

---

## 3. Multi-Tier Ingestion Pipeline

1. **Tier 1 — Authenticated User Sources (`subscriber_licensed` / `user_private`)**:
   - **X (Twitter) OAuth 2.0 PKCE**: Syncs Erik's curated X Lists, Bookmarks, and high-bookmark-velocity builder threads.
   - **Inbound Newsletter Alias (`intel+erik@ingest.vectra.ai`)**: Parses forwarded issues from *Stratechery*, *The Pragmatic Engineer*, *Latent Space*, and *Import AI*.
   - **Encrypted Session Cookie / Browserbase**: Extracts paywalled research portals using stealth browser contexts.
2. **Tier 2 — Public Enterprise & Regulatory Collectors (`public` / `global`)**:
   - Fortune 500 Engineering Blogs (RSS/Atom + Firecrawl Markdown).
   - SEC EDGAR `10-K` & `8-K` AI operational disclosures.
   - Regulatory & Standards Feeds (EU AI Act Annex IV, NIST AI RMF, OCC SR 11-7, FDA SaMD PCCP).

---

## 4. 14-Day Canonical Clustering Logic (`cosine > 0.84`)

When `cluster_and_attach_source_activity` receives an `IngestItemPayload`:
1. Computes the normalized 1536-dimensional embedding vector.
2. Queries `canonical_nodes` created within the active 14-day window.
3. If `cosine_similarity >= 0.84` (or strong domain title match), attaches the new `NodeSource` directly onto the existing `CanonicalNode`—preserving `user_private` visibility on subscriber quotes while enriching the shared node in Erik's RLS view.
4. Otherwise, instantiates a new `CanonicalNode` and attaches the primary source.

---

## 5. Cross-Platform `uv` & `uvx` Commands

```powershell
# Start the Temporal worker from the monorepo root
uv run python scripts/vectra_cli.py worker

# Or run directly inside apps/workers
cd apps/workers
uv run python worker.py
```
