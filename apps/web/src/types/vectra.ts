export type VariantLens = "c_suite" | "cto" | "contrarian";

export type RelationType =
  | "ENABLES"
  | "CONFLICTS_WITH"
  | "REGULATES"
  | "CASE_STUDY_OF"
  | "REPLACES";

export interface NodeSourceItem {
  id: string;
  node_id: string;
  source_type: string;
  source_name: string;
  author_handle: string;
  authority_tier: number;
  direct_url: string;
  exact_quote: string;
  provenance_license: "public" | "subscriber_licensed";
  visibility: "global" | "org_private" | "user_private";
  owner_user_id: string;
  published_at: string;
}

export interface ScoreBreakdown {
  base_signal_component?: number;
  source_authority_component: number;
  graph_centrality_component: number;
  consultant_weight: number;
  composite_score: number;
}

export interface CanonicalNodeItem {
  id: string;
  slug: string;
  title: string;
  summary_executive: string;
  summary_technical: string;
  summary_contrarian: string;
  claim_vendor: string;
  claim_builder: string;
  claim_production: string;
  industry_verticals: string[];
  maturity_stage: "research" | "pilot" | "production_scale";
  base_signal_score: number;
  consultant_weight: number;
  composite_score: number;
  score_breakdown: ScoreBreakdown;
  adoption_velocity: number;
  verified_roi_score: number;
  visibility: "global" | "org_private" | "user_private";
  owner_org_id: string;
  owner_user_id: string;
  consultant_note: string;
  extracted_wikilinks: string[];
  sources: NodeSourceItem[];
  // ForceGraph runtime coordinates
  x?: number;
  y?: number;
}

export interface AssociativeEdgeItem {
  id: string;
  source: string | CanonicalNodeItem;
  target: string | CanonicalNodeItem;
  source_node_id: string;
  target_node_id: string;
  relation_type: RelationType;
  weight: number;
  is_user_created: boolean;
  consultant_note: string;
  visibility: string;
  owner_user_id: string;
}

export interface UserIntegrationItem {
  id: string;
  provider: "x_oauth2" | "inbound_email" | "substack_session" | "github";
  account_handle: string;
  scopes: string[];
  status: "healthy" | "expiring_soon" | "expired";
  metadata: Record<string, any>;
  dek_fingerprint: string;
  iv_hex: string;
  auth_tag_hex: string;
  expires_at: string | null;
  last_synced_at: string | null;
}

export interface CopilotCitationRef {
  source_id: string;
  node_title: string;
  source_name: string;
  direct_url: string;
  provenance_license: "public" | "subscriber_licensed";
  exact_quote: string;
}

export type LocalLLMProvider =
  | "ollama"
  | "litellm_proxy"
  | "vllm"
  | "llamacpp"
  | "lmstudio";

export interface LocalLLMStatus {
  provider: LocalLLMProvider;
  provider_label: string;
  base_url: string;
  model: string;
  embedding_model: string;
  temperature: number;
  daemon_online: boolean;
  execution_mode: "local_llm" | "deterministic_local_fallback";
  commercial_models_blocked: boolean;
  discovered_models: string[];
  recommended_models: string[];
  probe_latency_ms: number;
  status_detail: string;
}

export interface MCPAuditEntry {
  audit_id: string;
  timestamp: string;
  tenant_user_id: string;
  tenant_org_id: string;
  server_id: string;
  jsonrpc_method: string;
  tool_or_resource: string;
  decision: "ALLOWED" | "DENIED";
  reason: string;
  latency_ms: number;
}

export interface MCPGatewayStatus {
  gateway_id: string;
  protocol_version: string;
  policy: {
    enforce_mcp_mediation: boolean;
    block_direct_model_db_access: boolean;
    allow_unproxied_stdio: boolean;
    redact_secrets_and_kms: boolean;
    require_tenant_rls_binding: boolean;
    active_scopes: string[];
  };
  servers: {
    server_id: string;
    name: string;
    transport: string;
    endpoint_url: string;
    enabled: boolean;
    allowed_scopes: string[];
    allowed_tools: string[];
    description: string;
  }[];
  tools: {
    name: string;
    server_id: string;
    required_scope: string;
    description: string;
  }[];
  audit_summary: {
    total_events: number;
    allowed_count: number;
    denied_count: number;
  };
  recent_audit_log: MCPAuditEntry[];
}

export interface CollectorPackSchedule {
  pack_id: string;
  name: string;
  tier: number;
  enabled: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_items_ingested: number;
  execution_mode: "live_rss_atom_feed" | "curated_verified_fallback" | string;
}

export interface CollectorPackItem {
  id: string;
  name: string;
  tier: number;
  source_type: string;
  feed_urls: string[];
  industry_verticals: string[];
  curated_signal_count: number;
  schedule: CollectorPackSchedule;
}

export interface CollectorPacksStatus {
  worker_queue: string;
  sec_edgar_user_agent: string;
  packs: CollectorPackItem[];
}

export interface PresentationSessionData {
  session_id: string;
  title: string;
  variant_lens: VariantLens;
  industry_vertical: string;
  copilot_synthesis: string | null;
  created_at: string;
  nodes: CanonicalNodeItem[];
  edges: AssociativeEdgeItem[];
}

export interface CopilotStructuredResponse {
  executive_answer: string;
  architectural_implications: string[];
  contrarian_risks: string[];
  recommended_90_day_actions: string[];
  citations_used: CopilotCitationRef[];
  subgraph_node_count: number;
  subgraph_edge_count: number;
  llm_provider?: string;
  llm_model?: string;
  execution_mode?: "local_llm" | "deterministic_local_fallback";
  commercial_models_blocked?: boolean;
  mcp_mediated?: boolean;
  mcp_tools_invoked?: string[];
  mcp_audit_ids?: string[];
  latency_ms?: number;
}
