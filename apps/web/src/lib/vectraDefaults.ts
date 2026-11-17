import {
  CollectorPacksStatus,
  LocalLLMProvider,
  LocalLLMStatus,
} from "@/types/vectra";

export const VERTICAL_LIST = [
  "All Verticals",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Manufacturing & Supply Chain",
  "Retail/CPG",
  "Legal/Professional Services",
  "Cross-Industry Horizontal",
];

export const LLM_PROVIDER_PRESETS: Record<
  LocalLLMProvider,
  { label: string; url: string; model: string; embed: string }
> = {
  ollama: {
    label: "Ollama (Default)",
    url: "http://localhost:11434",
    model: "qwen2.5:14b-instruct",
    embed: "nomic-embed-text",
  },
  litellm_proxy: {
    label: "LiteLLM Local",
    url: "http://localhost:4000/v1",
    model: "ollama/qwen2.5:14b-instruct",
    embed: "ollama/nomic-embed-text",
  },
  vllm: {
    label: "vLLM (GPU)",
    url: "http://localhost:8001/v1",
    model: "Qwen/Qwen2.5-14B-Instruct",
    embed: "BAAI/bge-m3",
  },
  llamacpp: {
    label: "llama.cpp",
    url: "http://localhost:8080/v1",
    model: "qwen2.5-14b-instruct-q4_k_m.gguf",
    embed: "nomic-embed-text-v1.5.Q8_0.gguf",
  },
  lmstudio: {
    label: "LM Studio",
    url: "http://localhost:1234/v1",
    model: "qwen2.5-14b-instruct",
    embed: "text-embedding-nomic-embed-text-v1.5",
  },
};

export const DEFAULT_LLM_STATUS: LocalLLMStatus = {
  provider: "ollama",
  provider_label: "Ollama (Local Daemon)",
  base_url: "http://localhost:11434",
  model: "qwen2.5:14b-instruct",
  embedding_model: "nomic-embed-text",
  temperature: 0.15,
  daemon_online: false,
  execution_mode: "deterministic_local_fallback",
  commercial_models_blocked: true,
  discovered_models: [],
  recommended_models: [
    "qwen2.5:14b-instruct",
    "llama3.3:8b",
    "deepseek-r1:14b",
    "mistral-nemo:12b",
    "phi4:14b",
  ],
  probe_latency_ms: 0,
  status_detail: "Sovereign Local Runtime (Ollama default — Zero Commercial Cloud)",
};

export const DEFAULT_COLLECTOR_STATUS: CollectorPacksStatus = {
  worker_queue: "vectra-intelligence-queue",
  sec_edgar_user_agent: "VECTRA-Advisory-OS/1.2 (erik@vectra.ai)",
  packs: [
    {
      id: "f500_ai_capex",
      name: "Fortune 500 Engineering & AI CapEx Telemetry",
      tier: 1,
      source_type: "eng_blog",
      feed_urls: ["https://netflixtechblog.com/feed", "https://stripe.com/blog/feed.rss"],
      industry_verticals: ["Cross-Industry Horizontal", "Retail/CPG", "Financial Services"],
      curated_signal_count: 2,
      schedule: {
        pack_id: "f500_ai_capex",
        name: "Fortune 500 Engineering & AI CapEx Telemetry",
        tier: 1,
        enabled: true,
        interval_minutes: 60,
        last_run_at: null,
        next_run_at: null,
        last_items_ingested: 0,
        execution_mode: "curated_verified_fallback",
      },
    },
    {
      id: "sec_edgar_8k",
      name: "SEC EDGAR Form 10-K / 8-K AI Operational Disclosures",
      tier: 1,
      source_type: "sec_filing",
      feed_urls: ["https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom"],
      industry_verticals: ["Financial Services", "Cross-Industry Horizontal"],
      curated_signal_count: 1,
      schedule: {
        pack_id: "sec_edgar_8k",
        name: "SEC EDGAR Form 10-K / 8-K AI Operational Disclosures",
        tier: 1,
        enabled: true,
        interval_minutes: 30,
        last_run_at: null,
        next_run_at: null,
        last_items_ingested: 0,
        execution_mode: "curated_verified_fallback",
      },
    },
    {
      id: "nist_eu_ai_act",
      name: "NIST AI RMF / EU AI Act Annex IV / OCC SR 11-7 Standards",
      tier: 1,
      source_type: "regulatory",
      feed_urls: ["https://www.nist.gov/news-events/artificial-intelligence/rss.xml"],
      industry_verticals: ["Financial Services", "Healthcare & Life Sciences", "Cross-Industry Horizontal"],
      curated_signal_count: 1,
      schedule: {
        pack_id: "nist_eu_ai_act",
        name: "NIST AI RMF / EU AI Act Annex IV / OCC SR 11-7 Standards",
        tier: 1,
        enabled: true,
        interval_minutes: 60,
        last_run_at: null,
        next_run_at: null,
        last_items_ingested: 0,
        execution_mode: "curated_verified_fallback",
      },
    },
  ],
};

export const DEFAULT_MCP_TOOLS = [
  { name: "vectra_get_rls_subgraph", server_id: "vectra-graph-mcp", required_scope: "graph:read", description: "" },
  { name: "vectra_inspect_cypher", server_id: "vectra-graph-mcp", required_scope: "cypher:read", description: "" },
  { name: "vectra_get_verified_citations", server_id: "vectra-citations-mcp", required_scope: "citations:read", description: "" },
  { name: "vectra_get_consultant_notes", server_id: "vectra-notes-mcp", required_scope: "notes:read", description: "" },
  { name: "vectra_preview_wikilink_edges", server_id: "vectra-notes-mcp", required_scope: "notes:read", description: "" },
  { name: "vectra_compute_local_embedding", server_id: "vectra-embeddings-mcp", required_scope: "embeddings:compute", description: "" },
  { name: "vectra_list_curated_packs", server_id: "vectra-embeddings-mcp", required_scope: "graph:read", description: "" },
  { name: "vectra_run_collector_pack", server_id: "vectra-embeddings-mcp", required_scope: "graph:read", description: "" },
  { name: "vectra_prepare_deliverable_manifest", server_id: "vectra-embeddings-mcp", required_scope: "graph:read", description: "" },
];
