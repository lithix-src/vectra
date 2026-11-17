"""Encrypted User Integrations, Associative Edges, and Consultant Notes Seed Fixtures."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


def get_integrations_seed(now: datetime) -> List[Dict[str, Any]]:
    """Return the 4 AES-256-GCM KMS-sealed user integrations for Erik."""
    return [
        {
            "owner_user_id": "erik",
            "owner_org_id": "vectra-advisory",
            "provider": "x_oauth2",
            "account_handle": "@erik_vectra_ai",
            "scopes": ["tweet.read", "users.read", "list.read", "bookmark.read", "offline.access"],
            "status": "healthy",
            "expires_at": now + timedelta(days=28),
            "last_synced_at": now - timedelta(minutes=11),
            "payload": {
                "access_token": "x_pkce_at_998123_erik_live",
                "refresh_token": "x_pkce_rt_442910_erik_offline",
                "monitored_lists": ["Enterprise AI Architects (142 members)", "F500 CTO Production Signals"],
                "bookmarks_synced": 418,
            },
            "metadata_json": {
                "monitored_lists": ["Enterprise AI Architects", "F500 CTO Production Signals"],
                "bookmarks_synced": 418,
                "rate_limit_remaining": "482/500",
                "pkce_challenge_method": "S256",
            },
        },
        {
            "owner_user_id": "erik",
            "owner_org_id": "vectra-advisory",
            "provider": "inbound_email",
            "account_handle": "intel+erik@ingest.vectra.ai",
            "scopes": ["newsletter.parse", "subscriber_provenance.attach", "entity.cluster"],
            "status": "healthy",
            "expires_at": None,
            "last_synced_at": now - timedelta(minutes=24),
            "payload": {
                "webhook_hmac_secret": "whsec_vectra_inbound_erik_2026",
                "whitelisted_publications": [
                    "Stratechery (Ben Thompson)",
                    "The Pragmatic Engineer (Gergely Orosz)",
                    "Latent Space (Swyx & Alessio)",
                    "Import AI (Jack Clark)",
                ],
            },
            "metadata_json": {
                "inbound_alias": "intel+erik@ingest.vectra.ai",
                "active_subscriptions": ["Stratechery", "The Pragmatic Engineer", "Latent Space", "Import AI"],
                "issues_ingested_30d": 37,
            },
        },
        {
            "owner_user_id": "erik",
            "owner_org_id": "vectra-advisory",
            "provider": "substack_session",
            "account_handle": "Browserbase Paywall Context (sid:88f1...a9c)",
            "scopes": ["cookie.substack_sid", "browserbase.stealth_context"],
            "status": "expiring_soon",
            "expires_at": now + timedelta(hours=36),
            "last_synced_at": now - timedelta(hours=2),
            "payload": {
                "connect_sid": "s%3A9f8e7d6c5b4a.paywall_authenticated_session",
                "browserbase_context_id": "bb_ctx_erik_enterprise_01",
            },
            "metadata_json": {
                "session_ttl_hours": 36,
                "alert": "Substack & SemiAnalysis session cookie expires in 36h — click Refresh Cookie to rotate.",
                "browserbase_region": "us-east-1",
            },
        },
        {
            "owner_user_id": "erik",
            "owner_org_id": "vectra-advisory",
            "provider": "github",
            "account_handle": "gh/erik-advisory-telemetry",
            "scopes": ["repo:status", "public_repo", "read:org"],
            "status": "healthy",
            "expires_at": now + timedelta(days=85),
            "last_synced_at": now - timedelta(minutes=6),
            "payload": {
                "pat_token": "ghp_vectra_enterprise_velocity_tracker",
                "tracked_repos": ["vllm-project/vllm", "modelcontextprotocol/servers", "langchain-ai/langgraph"],
            },
            "metadata_json": {
                "tracked_repos": ["vllm-project/vllm", "modelcontextprotocol/servers", "sgl-project/sglang"],
                "enterprise_pr_velocity": "+44% MoM",
            },
        },
    ]


EDGES_SEED_DATA: List[Dict[str, Any]] = [
    {
        "source_node_id": "node-vllm-disaggregated-serving",
        "target_node_id": "node-jpm-agentic-kyc",
        "relation_type": "ENABLES",
        "weight": 2.4,
        "is_user_created": False,
        "consultant_note": "Sub-190ms verifier guardrails in KYC DAGs rely on disaggregated prefill/decode KV caching.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-graphrag-pgvector-age",
        "target_node_id": "node-jpm-agentic-kyc",
        "relation_type": "ENABLES",
        "weight": 2.8,
        "is_user_created": True,
        "consultant_note": "Postgres 17 + pgvector + AGE powers the hybrid beneficial-ownership entity graph.",
        "visibility": "org_private",
        "owner_org_id": "vectra-advisory",
        "owner_user_id": "erik",
    },
    {
        "source_node_id": "node-eu-ai-act-gpai-audit",
        "target_node_id": "node-jpm-agentic-kyc",
        "relation_type": "REGULATES",
        "weight": 2.2,
        "is_user_created": False,
        "consultant_note": "OCC SR 11-7 and EU AI Act Annex IV govern automated AML/credit decisioning.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-eu-ai-act-gpai-audit",
        "target_node_id": "node-healthcare-ambient-samd",
        "relation_type": "REGULATES",
        "weight": 2.5,
        "is_user_created": False,
        "consultant_note": "FDA PCCP & EU High-Risk Medical Device Annex IV require extractive audio-span provenance.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-mcp-enterprise-gateway",
        "target_node_id": "node-eu-ai-act-gpai-audit",
        "relation_type": "CONFLICTS_WITH",
        "weight": 2.1,
        "is_user_created": False,
        "consultant_note": "Ungoverned stdio MCP servers violate Annex IV auditability unless routed via OAuth 2.1 gateways.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-mcp-enterprise-gateway",
        "target_node_id": "node-harvey-legal-redlining",
        "relation_type": "ENABLES",
        "weight": 1.9,
        "is_user_created": False,
        "consultant_note": "Signed MCP connectors bridge DMS (iManage/NetDocuments) into legal redlining workflows.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-graphrag-pgvector-age",
        "target_node_id": "node-harvey-legal-redlining",
        "relation_type": "CASE_STUDY_OF",
        "weight": 2.3,
        "is_user_created": True,
        "consultant_note": "Clause-level cross-reference traversal in M&A diligence uses hybrid vector + Cypher hops.",
        "visibility": "org_private",
        "owner_org_id": "vectra-advisory",
        "owner_user_id": "erik",
    },
    {
        "source_node_id": "node-siemens-industrial-copilot",
        "target_node_id": "node-walmart-retail-supply-mesh",
        "relation_type": "ENABLES",
        "weight": 1.8,
        "is_user_created": False,
        "consultant_note": "Factory floor OT telemetry feeds upstream retail inventory allocation demand sensing.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
    {
        "source_node_id": "node-vllm-disaggregated-serving",
        "target_node_id": "node-healthcare-ambient-samd",
        "relation_type": "CASE_STUDY_OF",
        "weight": 1.7,
        "is_user_created": False,
        "consultant_note": "VPC-isolated vLLM clusters serve low-latency longitudinal chart summarization.",
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
    },
]


NOTES_SEED_DATA: List[Dict[str, Any]] = [
    {
        "node_id": "node-jpm-agentic-kyc",
        "owner_user_id": "erik",
        "owner_org_id": "vectra-advisory",
        "visibility": "user_private",
        "markdown_content": (
            "### Erik's Advisory Field Note — Tier-1 Bank Architecture Review\n"
            "- **Boardroom Takeaway:** Emphasize to the Audit Committee that autonomous swarms failed in Q2; "
            "production ROI ($140M+) comes strictly from bounded Temporal state graphs.\n"
            "- **Architecture Dependency:** Latency SLA (<190ms p99) depends directly on "
            "[[Disaggregated Prefill/Decode & KV-Cache Routing at Scale]] and hybrid entity resolution via "
            "[[Consolidated PostgreSQL 17 (pgvector + Apache AGE) Replacing Standalone Vector/Graph DBs]].\n"
            "- **Compliance Gate:** Must map every verifier step to [[EU AI Act High-Risk & GPAI Enforcement + OCC SR 11-7 Harmonization]]."
        ),
    },
    {
        "node_id": "node-vllm-disaggregated-serving",
        "owner_user_id": "erik",
        "owner_org_id": "vectra-advisory",
        "visibility": "user_private",
        "markdown_content": (
            "### Erik's Infrastructure Field Note — GPU Cluster TCO\n"
            "- Do **not** recommend disaggregated prefill/decode unless the client has RoCEv2/InfiniBand or AWS EFA.\n"
            "- Directly unlocks low-latency verifier steps for [[Agentic KYC & Real-Time Fraud Settlement Pipelines]]."
        ),
    },
    {
        "node_id": "node-mcp-enterprise-gateway",
        "owner_user_id": "erik",
        "owner_org_id": "vectra-advisory",
        "visibility": "user_private",
        "markdown_content": (
            "### Erik's CISO Advisory Note — MCP Governance\n"
            "- Block local developer stdio MCP binaries on corporate laptops.\n"
            "- Mandate Streamable HTTP Gateways with OAuth 2.1 On-Behalf-Of (OBO) tokens to align with "
            "[[EU AI Act High-Risk & GPAI Enforcement + OCC SR 11-7 Harmonization]]."
        ),
    },
]
