# ARCHITECTURE_AND_ERD — VECTRA: Enterprise AI Intelligence & Advisory OS

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Sources["Multi-Tier Intelligence Sources"]
        X["X OAuth 2.0 PKCE (Lists, Bookmarks, Builder Threads)"]
        Email["Inbound Newsletter Webhook (intel+erik@ingest.vectra.ai)"]
        Cookie["Encrypted Session Cookie / Browserbase (Paywalled Portals)"]
        Public["Public Collectors (F500 Eng Blogs, SEC 10-K/8-K, EU AI Act/NIST/FDA)"]
    end

    subgraph Workers["/apps/workers — Temporal.io Orchestration"]
        TW["Temporal Worker Fleet"]
        KMS["AES-256-GCM Envelope KMS Decryptor (In-Memory Only)"]
        Cluster["Canonical Clustering Engine (Cosine > 0.84, 14-Day Window)"]
    end

    subgraph Storage["/packages/db — PostgreSQL 17 + pgvector + Apache AGE + RLS"]
        PG[("PostgreSQL 17 (RLS Enabled)")]
        VEC["pgvector HNSW Index (VECTOR 1536)"]
        AGE["Apache AGE Graph (Cypher Sync)"]
        REDIS[("Redis 7 Cache & PubSub")]
    end

    subgraph MCP["/apps/api/mcp_gateway.py — Zero-Trust MCP Gateway & Broker"]
        MCPG["MCPZeroTrustGateway (JSON-RPC 2.0 /api/mcp/rpc)"]
        ENV["HMAC-Signed MCPMediatedEnvelope (Zero Direct Model DB Access)"]
    end

    subgraph LocalLLM["/apps/api/llm_runtime.py — Sovereign Local LLM Runtime (0% Commercial Cloud)"]
        OLLAMA["Ollama Default (qwen2.5:14b-instruct + nomic-embed-text)"]
        LITELLM["LiteLLM Local Proxy / vLLM / llama.cpp / LM Studio"]
    end

    subgraph API["/apps/api — FastAPI + Instructor + python-pptx"]
        FAPI["FastAPI Async REST & Webhook Gateway"]
        RAG["Subgraph Co-Pilot (MCP-Mediated RAG)"]
        PPTX["python-pptx Executive Deck Generator"]
    end

    subgraph Web["/apps/web — Next.js 15 + React 19 (3-Pane Advisory OS)"]
        Left["Left Rail: Industry Switcher, Executive Pulse Heatmap, Variant Lens, Auth Vault"]
        Center["Center Canvas: react-force-graph-2d + @xyflow/react Variant Diff Matrix"]
        Right["Right Rail: Verbatim Citations, TipTap [[Wikilink]] Notes, Subgraph Co-Pilot"]
        Modals["Header Modals: Zero-Trust MCP Inspector, Sovereign Local LLM Config, + Ingest Signal"]
        Present["/present/[sessionId] Boardroom Dual-Window Mode"]
    end

    Sources --> TW
    Email --> FAPI
    TW <--> KMS
    TW --> Cluster
    Cluster --> PG
    PG --- VEC
    PG --- AGE
    FAPI <--> PG
    FAPI <--> REDIS
    FAPI --> MCPG
    MCPG <--> PG
    MCPG --> ENV
    ENV --> RAG
    RAG <--> OLLAMA
    RAG <--> LITELLM
    FAPI --> PPTX
    Web <--> FAPI
    Center --> Present
```

---

## 2. Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER_INTEGRATIONS {
        uuid id PK
        string owner_user_id
        string owner_org_id
        string provider "x_oauth2 | inbound_email | substack_session | github"
        string account_handle
        bytes encrypted_dek "KMS-wrapped Data Encryption Key"
        bytes encryption_iv "12-byte GCM nonce"
        bytes ciphertext "AES-256-GCM encrypted token/cookie payload"
        bytes auth_tag "16-byte GCM authentication tag"
        string[] scopes
        string status "healthy | expiring_soon | expired"
        timestamp expires_at
        timestamp last_synced_at
    }

    CANONICAL_NODES {
        uuid id PK
        string slug UK
        string title
        text summary_executive "C-Suite ROI, capital allocation, regulatory exposure"
        text summary_technical "CTO architecture, p99 latency, VRAM/throughput specs"
        text summary_contrarian "Skeptic failure modes, hidden TCO, vendor lock-in"
        text claim_vendor "Vendor marketing benchmark / headline claim"
        text claim_builder "Independent builder benchmark / field reality"
        text claim_production "Audited F500 production proof & telemetry"
        string[] industry_verticals
        string maturity_stage "research | pilot | production_scale"
        float base_signal_score
        float consultant_weight "Default 1.0 (0.5x to 5.0x)"
        float adoption_velocity "0-100 heatmap X-axis"
        float verified_roi_score "0-100 heatmap Y-axis"
        string visibility "global | org_private | user_private"
        string owner_org_id
        string owner_user_id
        vector_1536 embedding
        timestamp created_at
        timestamp updated_at
    }

    NODE_SOURCES {
        uuid id PK
        uuid node_id FK
        string source_type "x_thread | newsletter | sec_filing | eng_blog | regulatory | github"
        string source_name
        string author_handle
        int authority_tier "1 (Primary Filing/Prod Telemetry) | 2 (Verified Builder) | 3 (Commentary)"
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
        text consultant_note
        string visibility "global | org_private | user_private"
        string owner_user_id
        timestamp created_at
    }

    CONSULTANT_NOTES {
        uuid id PK
        uuid node_id FK
        string owner_user_id
        string owner_org_id
        text markdown_content "Contains [[Wikilinks]] parsed into associative_edges"
        string[] extracted_wikilinks
        timestamp updated_at
    }

    CANONICAL_NODES ||--o{ NODE_SOURCES : "evidenced_by"
    CANONICAL_NODES ||--o{ ASSOCIATIVE_EDGES : "source_of"
    CANONICAL_NODES ||--o{ ASSOCIATIVE_EDGES : "target_of"
    CANONICAL_NODES ||--o{ CONSULTANT_NOTES : "annotated_by"
```

---

## 3. Multi-Tenant Row-Level Security (RLS) & Credential Vault

### 3.1 PostgreSQL 17 Row-Level Security Policies
Every query executed by `/apps/api` sets tenant session context variables (`SET LOCAL app.current_user_id = 'erik'; SET LOCAL app.current_org_id = 'vectra-advisory';`):
- **Global & Private Node Visibility Policy**:
  ```sql
  CREATE POLICY canonical_nodes_tenant_isolation ON canonical_nodes
    FOR SELECT USING (
      visibility = 'global'
      OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
      OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    );
  ```
- **Source Provenance Isolation Policy**:
  Shared `global` canonical nodes can have both `global` (`public`) sources and `user_private` (`subscriber_licensed`) sources attached. The RLS policy on `node_sources` ensures Erik sees his private *Stratechery* / *Pragmatic Engineer* / private X Bookmark excerpts merged seamlessly onto global Canonical Nodes, while other tenants never see Erik's `user_private` rows.

### 3.2 AES-256-GCM Envelope Encryption Vault
1. **Master Key (KEK)**: Loaded in KMS abstraction (`VECTRA_KMS_MASTER_KEY`).
2. **Per-Integration Data Encryption Key (DEK)**: 32-byte random key generated per integration row, encrypted with the KEK.
3. **Token Ciphertext**: OAuth refresh tokens and session cookies are encrypted with the DEK using `AES-256-GCM` (12-byte IV + 16-byte authentication tag).
4. **Decryption Boundary**: Only Temporal worker activities decrypt tokens in-memory during scheduled scraping or OAuth token refresh. The API layer never returns raw tokens to the client.

---

## 4. Canonical Clustering & Composite Score Mathematics

For every Canonical Node $i$ with connected sources $S_i$ visible to the current tenant and edges $E_i$:

$$\text{Recency\_Decay}(s) = \exp\left(-\lambda \cdot \Delta t_{\text{days}}(s)\right), \quad \lambda = \frac{\ln(2)}{7}$$

$$\text{Authority\_Multiplier}(s) = \begin{cases} 3.0 & \text{if Tier 1 (Primary Filing / Production Telemetry)} \\ 2.0 & \text{if Tier 2 (Verified Principal Architect / Newsletter)} \\ 1.0 & \text{if Tier 3 (Market Commentary)} \end{cases}$$

$$\text{Graph\_Centrality}(i) = \sum_{e \in E_i} w_e \cdot \alpha_{\text{rel}}(e)$$

$$\text{Composite\_Score}(i) = \left( \sum_{s \in S_i} \left(\text{Authority\_Multiplier}(s) \times \text{Recency\_Decay}(s) \times 8.5\right) + \text{Graph\_Centrality}(i) \right) \times \text{Consultant\_Weight}_i$$
