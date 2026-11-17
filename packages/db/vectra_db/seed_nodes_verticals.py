"""Vertical Domain, Hybrid GraphRAG & RLS Verification Seed Fixtures (Nodes 6–10)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

VERTICAL_NODES_SEED: List[Dict[str, Any]] = [
    {
        "id": "node-siemens-industrial-copilot",
        "slug": "siemens-foxconn-plc-predictive-digital-twin",
        "title": "Industrial PLC Code Verification & Supply-Chain Exception Agents",
        "industry_verticals": ["Manufacturing & Supply Chain"],
        "maturity_stage": "production_scale",
        "base_signal_score": 79.0,
        "consultant_weight": 1.25,
        "adoption_velocity": 73.0,
        "verified_roi_score": 83.0,
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
        "summary_executive": (
            "Discrete and process manufacturers (Siemens, Schaeffler, Foxconn) are deploying domain-verified "
            "Structured Text (IEC 61131-3) PLC copilot systems alongside ERP supply-chain exception agents, cutting "
            "unplanned line downtime by 24% and engineering commissioning time by 38%."
        ),
        "summary_technical": (
            "Combines quantized 8B–14B edge models on industrial IPCs (NVIDIA IGX) with symbolic formal verification "
            "compilers for Siemens TIA Portal Structured Text, paired with SAP S/4HANA event-driven purchase-order "
            "rerouting agents."
        ),
        "summary_contrarian": (
            "Cloud-only frontier LLMs cannot meet the 15ms deterministic safety interlocks or air-gapped OT network "
            "requirements of factory floors; any generative PLC code must pass static formal verification before "
            "touching a physical controller."
        ),
        "claim_vendor": "\"Zero-shot cloud LLM autonomously controls factory robotics and optimizes global logistics.\"",
        "claim_builder": (
            "\"OT security prohibits cloud calls from PLC rings, and unconstrained LLMs invent invalid register "
            "addresses—formal AST verification in TIA Portal is non-negotiable.\""
        ),
        "claim_production": (
            "Schaeffler & Siemens production rollouts across 42 plants verified 38% faster PLC diagnostics and "
            "24% reduction in mean-time-to-repair (MTTR) on automated assembly lines."
        ),
    },
    {
        "id": "node-walmart-retail-supply-mesh",
        "slug": "walmart-retail-agentic-merchandising-replenishment",
        "title": "Autonomous Inventory Allocation & Catalog Normalization at Retail Scale",
        "industry_verticals": ["Retail/CPG", "Manufacturing & Supply Chain"],
        "maturity_stage": "production_scale",
        "base_signal_score": 77.0,
        "consultant_weight": 1.2,
        "adoption_velocity": 81.0,
        "verified_roi_score": 85.0,
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
        "summary_executive": (
            "Global omni-channel retailers (Walmart, Target, Unilever) have shifted AI investment from consumer "
            "chatbots to back-office SKU taxonomy normalization, micro-fulfillment demand sensing, and automated "
            "vendor contract negotiation—driving 180 bps gross margin expansion."
        ),
        "summary_technical": (
            "Fuses multimodal vision-language SKU attribute extraction with classical gradient-boosted spatiotemporal "
            "demand forecasting, executing automated replenishment micro-adjustments under human-defined margin "
            "and working-capital constraints."
        ),
        "summary_contrarian": (
            "Consumer-facing generative shopping assistants suffer <2.1% conversion lift and high prompt-injection "
            "brand risk (e.g., $1 binding offer exploits), whereas back-office catalog & allocation pipelines pay "
            "back within two quarters."
        ),
        "claim_vendor": "\"Conversational AI shopping concierges will replace search bars and double e-commerce conversion.\"",
        "claim_builder": (
            "\"Shoppers abandon high-latency chat widgets; the real margin is multimodal catalog enrichment and "
            "automated tail-spend vendor negotiation.\""
        ),
        "claim_production": (
            "Walmart SEC 10-K & NRF engineering disclosures confirm 850M+ catalog attributes normalized with 98.4% "
            "precision and $310M inventory carrying-cost reduction."
        ),
    },
    {
        "id": "node-harvey-legal-redlining",
        "slug": "harvey-legal-citation-verified-m-and-a-diligence",
        "title": "Citation-Locked M&A Due Diligence & Playbook-Grounded Contract Redlining",
        "industry_verticals": ["Legal/Professional Services", "Financial Services"],
        "maturity_stage": "production_scale",
        "base_signal_score": 82.0,
        "consultant_weight": 1.35,
        "adoption_velocity": 87.0,
        "verified_roi_score": 86.0,
        "visibility": "global",
        "owner_org_id": "global",
        "owner_user_id": "system",
        "summary_executive": (
            "AmLaw 50 firms (A&O Shearman, PwC Legal) and Fortune 500 general counsels have moved multi-document "
            "M&A data-room diligence and NDA/MSA redlining into production, compressing associate review hours by "
            "54% while forcing a shift from billable hours to fixed-fee value pricing."
        ),
        "summary_technical": (
            "Hierarchical clause-level indexing over 10,000+ Virtual Data Room (VDR) documents using layout-aware "
            "PDF parsing, cross-reference graph traversal, and deterministic citation verification that rejects any "
            "generated clause lacking an exact byte-offset anchor in the firm's approved playbook."
        ),
        "summary_contrarian": (
            "Generic RAG over naive 512-token chunks destroys legal definitions separated by 60 pages and misses "
            "change-of-control poison pills; without structural AST clause graphs, legal AI creates malpractice exposure."
        ),
        "claim_vendor": "\"Upload a 5,000-file M&A data room into a 2M-token context window and get instant risk summaries.\"",
        "claim_builder": (
            "\"Long-context needle-in-a-haystack degrades sharply when cross-referencing 400 defined terms across "
            "schedules and amendments; clause-graph indexing with byte-offset verifier passes is mandatory.\""
        ),
        "claim_production": (
            "A&O Shearman & PwC production audits show 54% faster M&A lease/change-of-control covenant extraction "
            "with 99.2% partner-verified citation accuracy."
        ),
    },
    {
        "id": "node-graphrag-pgvector-age",
        "slug": "hybrid-graphrag-pgvector-apache-age-consolidation",
        "title": "Consolidated PostgreSQL 17 (pgvector + Apache AGE) Replacing Standalone Vector/Graph DBs",
        "industry_verticals": ["Cross-Industry Horizontal", "Financial Services", "Healthcare & Life Sciences"],
        "maturity_stage": "production_scale",
        "base_signal_score": 86.0,
        "consultant_weight": 1.7,
        "adoption_velocity": 88.0,
        "verified_roi_score": 92.0,
        "visibility": "org_private",
        "owner_org_id": "vectra-advisory",
        "owner_user_id": "erik",
        "summary_executive": (
            "[VECTRA Advisory Thesis] Enterprise CTOs are decommissioning standalone SaaS vector and graph databases "
            "in favor of consolidated PostgreSQL 17 with pgvectorscale/HNSW and Apache AGE—eliminating dual-write "
            "consistency bugs, enforcing native Row-Level Security (RLS), and cutting data-tier TCO by 64%."
        ),
        "summary_technical": (
            "Combines pgvector HNSW DiskANN indexing (halfvec FP16 quantization) with Apache AGE openCypher 1-to-3 hop "
            "subgraph expansion inside a single ACID transaction, governed by native PostgreSQL RLS policies (`global`, "
            "`org_private`, `user_private`)."
        ),
        "summary_contrarian": (
            "Standalone vector DB vendors pitch specialized engines, but in 92% of enterprise workloads (<100M vectors), "
            "the real bottleneck is broken ACL synchronization between primary relational tables and external indexes."
        ),
        "claim_vendor": "\"You need a dedicated managed vector database and a separate graph database cluster for enterprise RAG.\"",
        "claim_builder": (
            "\"Syncing RBAC/RLS permissions across Postgres, Pinecone, and Neo4j is an operational nightmare that "
            "inevitably leaks cross-tenant embeddings during permission revocations.\""
        ),
        "claim_production": (
            "Benchmarks across 6 Fortune 500 advisory engagements confirm Postgres 17 + pgvector + AGE delivers "
            "sub-28ms hybrid vector+Cypher retrieval at 50M vectors with zero ACL drift and 64% lower infra spend."
        ),
    },
    {
        "id": "node-foreign-tenant-secret",
        "slug": "foreign-tenant-classified-alpha",
        "title": "[RESTRICTED] Competitor Tenant Private Deal Room Node",
        "industry_verticals": ["Financial Services"],
        "maturity_stage": "research",
        "base_signal_score": 99.0,
        "consultant_weight": 2.0,
        "adoption_velocity": 50.0,
        "verified_roi_score": 50.0,
        "visibility": "user_private",
        "owner_org_id": "other-org",
        "owner_user_id": "other_consultant",
        "summary_executive": "This record belongs to another tenant and MUST be filtered out by RLS for Erik.",
        "summary_technical": "Foreign tenant technical note.",
        "summary_contrarian": "Foreign tenant contrarian note.",
        "claim_vendor": "N/A",
        "claim_builder": "N/A",
        "claim_production": "N/A",
    },
]


def get_vertical_sources_seed(now: datetime) -> List[Dict[str, Any]]:
    """Primary public, subscriber-licensed, and foreign-tenant RLS test sources for Nodes 6–10."""
    return [
        {
            "node_id": "node-siemens-industrial-copilot",
            "source_type": "eng_blog",
            "source_name": "Siemens AG & Schaeffler Group Industrial Automation Production Report",
            "author_handle": "@SiemensIndustry",
            "authority_tier": 1,
            "direct_url": "https://press.siemens.com/global/en/pressrelease/industrial-copilot-schaeffler-production",
            "exact_quote": (
                "Verified IEC 61131-3 Structured Text generation paired with TIA Portal formal AST validation reduced "
                "PLC fault diagnosis and commissioning time by 38% across 42 manufacturing plants."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=5),
        },
        {
            "node_id": "node-walmart-retail-supply-mesh",
            "source_type": "sec_filing",
            "source_name": "Walmart Inc. Form 10-K & Global Tech Supply Chain Architecture Briefing",
            "author_handle": "SEC EDGAR CIK 0000104169",
            "authority_tier": 1,
            "direct_url": "https://www.sec.gov/edgar/browse/?CIK=0000104169",
            "exact_quote": (
                "Multimodal catalog normalization across 850M+ SKU attributes and automated regional inventory "
                "re-allocation reduced safety-stock carrying costs by $310M while improving on-shelf availability by 190 bps."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=4),
        },
        {
            "node_id": "node-walmart-retail-supply-mesh",
            "source_type": "newsletter",
            "source_name": "Stratechery Daily Update (Ben Thompson — Subscriber Copy via intel+erik@ingest.vectra.ai)",
            "author_handle": "@benthompson",
            "authority_tier": 2,
            "direct_url": "https://stratechery.com/2026/retail-aggregation-and-back-office-ai/",
            "exact_quote": (
                "[SUBSCRIBER LICENSED] The narrative around consumer shopping chatbots completely missed where retail "
                "operating leverage actually lives: automated SKU ontology mapping and autonomous supplier rebate "
                "reconciliation are generating 8x the ROI of front-end chat widgets."
            ),
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "vectra-advisory",
            "owner_user_id": "erik",
            "published_at": now - timedelta(days=2),
        },
        {
            "node_id": "node-harvey-legal-redlining",
            "source_type": "eng_blog",
            "source_name": "A&O Shearman & PwC Legal Production Benchmark Audit",
            "author_handle": "@AOShearman_Tech",
            "authority_tier": 1,
            "direct_url": "https://www.aoshearman.com/en/insights/ai-in-m-and-a-diligence-benchmark",
            "exact_quote": (
                "Clause-graph extraction with mandatory byte-offset playbook verification reduced M&A Virtual Data Room "
                "covenant review duration by 54% across 120 live transactions with 99.2% partner sign-off."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=2),
        },
        {
            "node_id": "node-graphrag-pgvector-age",
            "source_type": "newsletter",
            "source_name": "Import AI + VECTRA Internal Benchmark (Subscriber & Advisory Telemetry)",
            "author_handle": "@jackclarkSF / @erik_vectra_ai",
            "authority_tier": 1,
            "direct_url": "https://importai.substack.com/p/enterprise-rag-consolidation-postgres",
            "exact_quote": (
                "[SUBSCRIBER LICENSED] Consolidating vector embeddings (pgvector HNSW) and associative property graphs "
                "(Apache AGE) inside PostgreSQL 17 with native RLS policies eliminated 100% of cross-tenant permission "
                "drift incidents and cut monthly database infrastructure spend by 64%."
            ),
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "vectra-advisory",
            "owner_user_id": "erik",
            "published_at": now - timedelta(hours=14),
        },
        {
            "node_id": "node-jpm-agentic-kyc",
            "source_type": "newsletter",
            "source_name": "Foreign Tenant Private Note (Hidden by RLS)",
            "author_handle": "@other_consultant",
            "authority_tier": 3,
            "direct_url": "https://internal.other-org.example/secret",
            "exact_quote": "RESTRICTED FOREIGN TENANT QUOTE — MUST NOT APPEAR IN ERIK'S RLS VIEW.",
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "other-org",
            "owner_user_id": "other_consultant",
            "published_at": now - timedelta(hours=5),
        },
    ]
