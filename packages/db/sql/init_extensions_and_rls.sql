-- =============================================================================
-- VECTRA — Enterprise AI Intelligence & Advisory OS
-- PostgreSQL 17 Schema, pgvector + Apache AGE Extensions, and Row-Level Security
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "age";

LOAD 'age';
SET search_path = ag_catalog, "$user", public;

SELECT create_graph('vectra_knowledge_graph');

SET search_path = public, ag_catalog;

-- 1. user_integrations (Multi-Tenant Credential Vault with AES-256-GCM Envelope Encryption)
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id VARCHAR(128) NOT NULL,
    owner_org_id VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL CHECK (provider IN ('x_oauth2', 'inbound_email', 'substack_session', 'github')),
    account_handle VARCHAR(255) NOT NULL,
    encrypted_dek BYTEA NOT NULL,
    encryption_iv BYTEA NOT NULL,
    ciphertext BYTEA NOT NULL,
    auth_tag BYTEA NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'expiring_soon', 'expired')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. canonical_nodes (14-Day Clustered Enterprise Intelligence Events)
CREATE TABLE IF NOT EXISTS canonical_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(160) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary_executive TEXT NOT NULL,
    summary_technical TEXT NOT NULL,
    summary_contrarian TEXT NOT NULL,
    claim_vendor TEXT NOT NULL,
    claim_builder TEXT NOT NULL,
    claim_production TEXT NOT NULL,
    industry_verticals JSONB NOT NULL DEFAULT '[]'::jsonb,
    maturity_stage VARCHAR(32) NOT NULL CHECK (maturity_stage IN ('research', 'pilot', 'production_scale')),
    base_signal_score DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    consultant_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (consultant_weight >= 0.5 AND consultant_weight <= 5.0),
    adoption_velocity DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    verified_roi_score DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    visibility VARCHAR(32) NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'org_private', 'user_private')),
    owner_org_id VARCHAR(128) NOT NULL DEFAULT 'global',
    owner_user_id VARCHAR(128) NOT NULL DEFAULT 'system',
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_nodes_embedding_hnsw
    ON canonical_nodes USING hnsw (embedding vector_cosine_ops);

-- 3. node_sources (Primary Evidence Links Attached 1-to-Many to Canonical Nodes)
CREATE TABLE IF NOT EXISTS node_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES canonical_nodes(id) ON DELETE CASCADE,
    source_type VARCHAR(64) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    author_handle VARCHAR(255) NOT NULL,
    authority_tier INTEGER NOT NULL CHECK (authority_tier BETWEEN 1 AND 3),
    direct_url TEXT NOT NULL,
    exact_quote TEXT NOT NULL,
    provenance_license VARCHAR(32) NOT NULL CHECK (provenance_license IN ('public', 'subscriber_licensed')),
    visibility VARCHAR(32) NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'org_private', 'user_private')),
    owner_org_id VARCHAR(128) NOT NULL DEFAULT 'global',
    owner_user_id VARCHAR(128) NOT NULL DEFAULT 'system',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. associative_edges (Directed / Weighted Relationships in Knowledge Graph)
CREATE TABLE IF NOT EXISTS associative_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES canonical_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES canonical_nodes(id) ON DELETE CASCADE,
    relation_type VARCHAR(64) NOT NULL CHECK (relation_type IN ('ENABLES', 'CONFLICTS_WITH', 'REGULATES', 'CASE_STUDY_OF', 'REPLACES')),
    weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    is_user_created BOOLEAN NOT NULL DEFAULT FALSE,
    consultant_note TEXT DEFAULT '',
    visibility VARCHAR(32) NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'org_private', 'user_private')),
    owner_org_id VARCHAR(128) NOT NULL DEFAULT 'global',
    owner_user_id VARCHAR(128) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_node_id, target_node_id, relation_type, owner_user_id)
);

-- 5. consultant_notes (Per-Node Obsidian Markdown Field Notes with [[Wikilinks]])
CREATE TABLE IF NOT EXISTS consultant_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES canonical_nodes(id) ON DELETE CASCADE,
    owner_user_id VARCHAR(128) NOT NULL,
    owner_org_id VARCHAR(128) NOT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'user_private' CHECK (visibility IN ('global', 'org_private', 'user_private')),
    markdown_content TEXT NOT NULL DEFAULT '',
    extracted_wikilinks JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (node_id, owner_user_id)
);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES (global | org_private | user_private)
-- =============================================================================

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE associative_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE canonical_nodes FORCE ROW LEVEL SECURITY;
ALTER TABLE node_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE associative_edges FORCE ROW LEVEL SECURITY;
ALTER TABLE consultant_notes FORCE ROW LEVEL SECURITY;

-- user_integrations: strict owner_user_id isolation
CREATE POLICY rls_user_integrations_isolation ON user_integrations
    USING (owner_user_id = current_setting('app.current_user_id', true))
    WITH CHECK (owner_user_id = current_setting('app.current_user_id', true));

-- canonical_nodes: global OR matching org_private OR matching user_private
CREATE POLICY rls_canonical_nodes_isolation ON canonical_nodes
    USING (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    )
    WITH CHECK (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    );

-- node_sources: allows merging user_private subscriber sources onto global nodes without cross-tenant leakage
CREATE POLICY rls_node_sources_isolation ON node_sources
    USING (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    )
    WITH CHECK (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    );

-- associative_edges: global edges + user/org private edges
CREATE POLICY rls_associative_edges_isolation ON associative_edges
    USING (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    )
    WITH CHECK (
        visibility = 'global'
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
    );

-- consultant_notes: private per consultant or shared org_private
CREATE POLICY rls_consultant_notes_isolation ON consultant_notes
    USING (
        (visibility = 'user_private' AND owner_user_id = current_setting('app.current_user_id', true))
        OR (visibility = 'org_private' AND owner_org_id = current_setting('app.current_org_id', true))
        OR visibility = 'global'
    )
    WITH CHECK (
        owner_user_id = current_setting('app.current_user_id', true)
    );
