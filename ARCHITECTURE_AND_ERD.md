# ARCHITECTURE_AND_ERD — VECTRA: Enterprise AI Intelligence & Advisory OS

> See [`AGENTS.md`](./AGENTS.md) for the mandatory `350 + 20%` (`420` LOC) modularity standard and [`DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md`](./DEPLOYMENT_AND_REVIEW_ARCHITECTURE.md) for the 6-Gate local pre-commit review pipeline.

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Sources["Multi-Tier Intelligence Sources"]
        X["X OAuth 2.0 PKCE (Lists, Bookmarks, Builder Threads)"]
        Email["Inbound Newsletter Webhook (intel+<user>@ingest.vectra.ai)"]
        Cookie["Encrypted Session Cookie / Browserbase (Paywalled Portals)"]
        Public["Curated & Live RSS/Atom Collectors (F500 CapEx, SEC 8-K, NIST/EU AI Act)"]
    end

    subgraph Workers["/apps/workers — worker.py & tasks.py"]
        TW["Temporal Worker Fleet & Collector Scheduler"]
        KMS["AES-256-GCM KMS + HKDF-SHA256 (Worker-Only Decrypt)"]
        Cluster["Idempotent Canonical Clustering (Cosine > 0.84, 14-Day Window)"]
    end

    subgraph Storage["/packages/db — PostgreSQL 17 + pgvector + Apache AGE + RLS"]
        PG[("PostgreSQL 17 (ENABLE + FORCE RLS) / SQLite Fallback")]
        VEC["pgvector HNSW Index (VECTOR 1536)"]
        AGE["Apache AGE Graph (3-Tier RLS OpenCypher)"]
    end

    subgraph MCP["/apps/api/mcp_*.py — Zero-Trust MCP Gateway & Broker"]
        MCPG["MCPZeroTrustGateway (JSON-RPC 2.0 /api/mcp/rpc, 4 Servers, 9 Tools)"]
        ENV["HMAC-Signed MCPMediatedEnvelope + KMS/Token Redaction"]
    end

    subgraph LocalLLM["/apps/api/llm_*.py — Sovereign Local LLM Runtime (0% Commercial Cloud)"]
        OLLAMA["Ollama Default (qwen2.5:14b-instruct + nomic-embed-text -> 1536-d)"]
        LITELLM["LiteLLM Local Proxy / vLLM / llama.cpp / LM Studio"]
    end

    subgraph API["/apps/api — Modular FastAPI Routers & Services"]
        FAPI["main.py + routes_ingest_auth.py + routes_copilot_deliverables.py"]
        RAG["Subgraph Co-Pilot (MCP-Mediated Structured JSON RAG)"]
        PPTX["pptx_generator.py (.pptx) & Executive Brief (.md)"]
    end

    subgraph Web["/apps/web/src — Modular Next.js 15 + React 19 (3-Pane OS)"]
        Panes["WorkspaceHeader + LeftRailSnapView + CenterWorkspacePane + RightRailInspector"]
        Modals["Modals: MCP Gateway, Local LLM, Collector Scheduler, + Ingest Signal, Cypher/Math"]
        Present["/present/[sessionId] Dual-Window BroadcastChannel Boardroom Mode"]
    end

    Sources --> TW
    Email --> FAPI
    TW <--> KMS
    TW --> Cluster --> PG
    PG --- VEC
    PG --- AGE
    FAPI <--> PG
    FAPI --> MCPG <--> PG
    MCPG --> ENV --> RAG
    RAG <--> OLLAMA
    RAG <--> LITELLM
    FAPI --> PPTX
    Panes <--> FAPI
    Modals <--> FAPI
    Panes --> Present
```

---

## 2. Database Entity-Relationship Diagram (ERD)

Full DDL and RLS policies live in [`packages/db/sql/init_extensions_and_rls.sql`](./packages/db/sql/init_extensions_and_rls.sql) and ORM definitions in [`packages/db/vectra_db/models.py`](./packages/db/vectra_db/models.py).

```mermaid
erDiagram
    USER_INTEGRATIONS {
        uuid id PK
        string owner_user_id
        string owner_org_id
        string provider "x_oauth2 | inbound_email | substack_session | github"
        string account_handle
        bytes encrypted_dek "12B dek_iv + KEK-wrapped 256-bit DEK"
        bytes encryption_iv "12-byte GCM nonce"
        bytes ciphertext "AES-256-GCM encrypted payload"
        bytes auth_tag "16-byte GCM authentication tag"
        string[] scopes
        string status "healthy | expiring_soon | expired"
    }

    CANONICAL_NODES {
        uuid id PK
        string slug UK
        string title
        text summary_executive
        text summary_technical
        text summary_contrarian
        text claim_vendor
        text claim_builder
        text claim_production
        string[] industry_verticals
        string maturity_stage "research | pilot | production_scale"
        float base_signal_score
        float consultant_weight "0.5x to 5.0x"
        string visibility "global | org_private | user_private"
        vector_1536 embedding
    }

    NODE_SOURCES {
        uuid id PK
        uuid node_id FK
        string source_type
        string source_name
        int authority_tier "1 | 2 | 3"
        string direct_url
        text exact_quote
        string provenance_license "public | subscriber_licensed"
        string visibility "global | org_private | user_private"
        string owner_user_id
        timestamp published_at
    }

    ASSOCIATIVE_EDGES {
        uuid id PK
        uuid source_node_id FK
        uuid target_node_id FK
        string relation_type "ENABLES | CONFLICTS_WITH | REGULATES | CASE_STUDY_OF | REPLACES"
        float weight "0.5 to 5.0"
        boolean is_user_created
        string visibility "global | org_private | user_private"
    }

    CONSULTANT_NOTES {
        uuid id PK
        uuid node_id FK
        string owner_user_id
        text markdown_content
        string[] extracted_wikilinks
    }

    CANONICAL_NODES ||--o{ NODE_SOURCES : "evidenced_by"
    CANONICAL_NODES ||--o{ ASSOCIATIVE_EDGES : "source_of"
    CANONICAL_NODES ||--o{ ASSOCIATIVE_EDGES : "target_of"
    CANONICAL_NODES ||--o{ CONSULTANT_NOTES : "annotated_by"
```

---

## 3. Multi-Tenant Row-Level Security (RLS) & KMS Envelope Vault

1. **PostgreSQL 17 `ENABLE` + `FORCE ROW LEVEL SECURITY` ([`init_extensions_and_rls.sql`](./packages/db/sql/init_extensions_and_rls.sql))**:
   - Scoped per transaction via `app.current_user_id` and `app.current_org_id` in [`session.py`](./packages/db/vectra_db/session.py), mirrored by `rls_visibility_filter()` on SQLite fallback.
   - Allows `user_private` (`[Subscriber Licensed]`) sources to attach onto shared `global` Canonical Nodes without cross-tenant leakage.
2. **AES-256-GCM Envelope Vault & HKDF ([`vault.py`](./packages/db/vectra_db/vault.py) & [`security.py`](./packages/db/vectra_db/security.py))**:
   - Per-record 256-bit DEKs wrapped under `VECTRA_KMS_MASTER_KEY` + deterministic per-tenant `HKDF-SHA256` key derivation (`derive_tenant_kek_hkdf()`).
   - Decrypted **only** inside worker memory (`decrypt_in_worker_memory()`).

---

## 4. Canonical Clustering & Composite Score Mathematics ([`scoring.py`](./packages/db/vectra_db/scoring.py))

For each Canonical Node $i$ with visible sources $S_i$ and incident edges $E_i$:

$$\text{Recency\_Decay}(s) = \exp\left(-\lambda \cdot \Delta t_{\text{days}}(s)\right), \quad \lambda = \frac{\ln(2)}{10.0}$$

$$\text{Authority\_Multiplier}(s) = \begin{cases} 3.0 & \text{Tier 1 (Primary Filing / Production Telemetry / Regulatory)} \\ 2.1 & \text{Tier 2 (Verified Principal Builder / Paid Newsletter)} \\ 1.2 & \text{Tier 3 (Secondary Market Commentary)} \end{cases}$$

$$\text{Graph\_Centrality}(i) = \sum_{e \in E_i} w_e \cdot \alpha_{\text{rel}}(e), \quad \alpha_{\text{rel}} \in [3.5, 4.5]$$

$$\text{Composite\_Score}(i) = \operatorname{round}\!\left(\left(0.35 \cdot B_i + \sum_{s \in S_i} \text{Authority\_Multiplier}(s) \cdot \text{Recency\_Decay}(s) \cdot 9.5 + \text{Graph\_Centrality}(i)\right) \times \operatorname{clip}(W_i, 0.5, 5.0),\; 1\right)$$
