"""Multi-Industry Enterprise AI Intelligence Seed Dataset for VECTRA.

Includes:
- AES-256-GCM encrypted user_integrations for Erik (x_oauth2, inbound_email, substack_session, github)
- 10 Canonical Intelligence Nodes spanning all 6 industry verticals:
  1. Financial Services
  2. Healthcare & Life Sciences
  3. Manufacturing & Supply Chain
  4. Retail/CPG
  5. Legal/Professional Services
  6. Cross-Industry Horizontal
- Primary Node Sources (both Public Tier-1/2/3 and Subscriber-Licensed private sources scoped to Erik)
- Associative Edges (ENABLES, CONFLICTS_WITH, REGULATES, CASE_STUDY_OF, REPLACES)
- Erik's private Consultant Field Notes with bidirectional [[Wikilinks]]
- A foreign tenant's ('competitor_tenant') private node & source to verify strict RLS isolation
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    AssociativeEdge,
    CanonicalNode,
    ConsultantNote,
    NodeSource,
    UserIntegration,
)
from .scoring import deterministic_embedding_1536, extract_wikilinks
from .vault import KMSEnvelopeVault


async def seed_database(session: AsyncSession) -> dict[str, int]:
    existing = await session.execute(select(CanonicalNode).limit(1))
    if existing.scalars().first() is not None:
        return {"seeded": 0}

    now = datetime.now(timezone.utc)
    vault = KMSEnvelopeVault()

    # -------------------------------------------------------------------------
    # 1. Seed Encrypted Credential Vault (`user_integrations`) for Erik
    # -------------------------------------------------------------------------
    integrations_spec = [
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

    for spec in integrations_spec:
        env = vault.encrypt_payload(spec["payload"], aad_context=f"erik:{spec['provider']}")
        session.add(
            UserIntegration(
                owner_user_id=spec["owner_user_id"],
                owner_org_id=spec["owner_org_id"],
                provider=spec["provider"],
                account_handle=spec["account_handle"],
                encrypted_dek=env.encrypted_dek,
                encryption_iv=env.encryption_iv,
                ciphertext=env.ciphertext,
                auth_tag=env.auth_tag,
                scopes=spec["scopes"],
                status=spec["status"],
                metadata_json=spec["metadata_json"],
                expires_at=spec["expires_at"],
                last_synced_at=spec["last_synced_at"],
            )
        )

    # -------------------------------------------------------------------------
    # 2. Seed Canonical Intelligence Nodes (`canonical_nodes`)
    # -------------------------------------------------------------------------
    nodes_data = [
        {
            "id": "node-jpm-agentic-kyc",
            "slug": "jpm-stripe-agentic-kyc-settlement",
            "title": "Agentic KYC & Real-Time Fraud Settlement Pipelines",
            "industry_verticals": ["Financial Services", "Cross-Industry Horizontal"],
            "maturity_stage": "production_scale",
            "base_signal_score": 88.0,
            "consultant_weight": 1.6,
            "adoption_velocity": 86.0,
            "verified_roi_score": 91.0,
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "summary_executive": (
                "Tier-1 banks (JPMorgan, Morgan Stanley) and payment rails (Stripe) have transitioned KYC/AML entity "
                "resolution from human queues to deterministic state-graph agents, compressing manual compliance review "
                "costs by 62% ($140M+ annualized savings) while passing OCC Model Risk Management (SR 11-7) audits."
            ),
            "summary_technical": (
                "Production topology replaces free-form ReAct loops with bounded DAG state machines (Temporal + vLLM "
                "structured JSON outputs). Uses hybrid dense/sparse pgvector retrieval over sanctions graphs with "
                "sub-190ms p99 verifier guardrails and cryptographic audit logs per tool invocation."
            ),
            "summary_contrarian": (
                "Unbounded multi-agent swarms failed catastrophically in Q2 pilots due to non-deterministic tool loops "
                "and 11% hallucinated beneficial-ownership links. Only rigid state-machine orchestration with human-in-the-loop "
                "escalation above $250k exposure survives OCC/FINRA examination."
            ),
            "claim_vendor": (
                "\"Autonomous AI compliance agents eliminate 95% of AML analysts out-of-the-box with zero schema tuning.\""
            ),
            "claim_builder": (
                "\"Free-form multi-agent frameworks loop indefinitely on nested shell-company PDFs; you need deterministic "
                "Temporal state graphs, strict Pydantic grammar masks, and dual-model verification.\""
            ),
            "claim_production": (
                "JPMorgan 10-K & Stripe Production Engineering report 62% reduction in L1/L2 false-positive review time "
                "and $140M audited run-rate savings when constrained to deterministic DAG workflows."
            ),
        },
        {
            "id": "node-vllm-disaggregated-serving",
            "slug": "vllm-disaggregated-prefill-decode",
            "title": "Disaggregated Prefill/Decode & KV-Cache Routing at Scale",
            "industry_verticals": ["Cross-Industry Horizontal", "Financial Services", "Retail/CPG"],
            "maturity_stage": "production_scale",
            "base_signal_score": 92.0,
            "consultant_weight": 1.8,
            "adoption_velocity": 91.0,
            "verified_roi_score": 89.0,
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "summary_executive": (
                "Enterprises running internal H100/B200 clusters are cutting inference compute spend by 48–56% by "
                "decoupling compute-bound prompt prefill from memory-bandwidth-bound token decode via vLLM v0.7+ and "
                "prefix-aware KV-cache routing across multi-tenant workloads."
            ),
            "summary_technical": (
                "Separates prefill nodes (high FP8 FLOPs) from decode nodes (high HBM3e bandwidth) connected over "
                "RDMA/RoCEv2 with Nixl/Mooncake distributed KV-cache pools. Eliminates TTFT spikes on 64k+ context "
                "RAG prompts while maintaining <18ms inter-token latency (ITL) at 3.2x higher batch concurrency."
            ),
            "summary_contrarian": (
                "For organizations spending under $80k/month on inference or lacking RDMA/InfiniBand fabric, "
                "disaggregated serving introduces severe DevOps orchestration overhead and tail-latency degradation "
                "over standard TCP networking."
            ),
            "claim_vendor": (
                "\"Drop-in 5x GPU throughput multiplier on any Kubernetes cluster regardless of network topology.\""
            ),
            "claim_builder": (
                "\"Without RoCEv2/InfiniBand or NVLink fabric, transferring multi-gigabyte KV caches across nodes "
                "saturates standard 25GbE NICs and stalls decode queues.\""
            ),
            "claim_production": (
                "Stripe & Uber AI Platform telemetry confirms 52% lower cost-per-million tokens and 3.1x higher goodput "
                "on 32k-context workloads using RDMA-backed KV-cache prefix routing."
            ),
        },
        {
            "id": "node-mcp-enterprise-gateway",
            "slug": "mcp-zero-trust-enterprise-gateway",
            "title": "Model Context Protocol (MCP) Zero-Trust Enterprise Gateways",
            "industry_verticals": ["Cross-Industry Horizontal", "Financial Services", "Legal/Professional Services"],
            "maturity_stage": "pilot",
            "base_signal_score": 84.0,
            "consultant_weight": 1.5,
            "adoption_velocity": 89.0,
            "verified_roi_score": 74.0,
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "summary_executive": (
                "MCP has emerged as the de-facto USB-C standard for connecting enterprise data systems (Snowflake, "
                "ServiceNow, GitHub, Salesforce) to internal AI assistants, reducing custom connector integration "
                "timelines from 6 weeks to 4 days—provided CISOs enforce centralized OAuth/RBAC gateway proxies."
            ),
            "summary_technical": (
                "Replaces ad-hoc stdio MCP servers with stateless Streamable HTTP/SSE gateways enforcing per-tool OAuth 2.1 "
                "token exchange (RFC 8693), row-level tenant context propagation, and deterministic prompt-injection "
                "sanitization on untrusted tool outputs."
            ),
            "summary_contrarian": (
                "Raw developer-desktop MCP servers represent the #1 CISO shadow-AI exfiltration vector in 2026: "
                "cross-server tool poisoning and ambient bearer tokens allow malicious third-party schemas to exfiltrate "
                "CRM records unless wrapped in an inspecting zero-trust proxy."
            ),
            "claim_vendor": (
                "\"Plug any enterprise database into any LLM agent in 5 minutes with universal MCP servers.\""
            ),
            "claim_builder": (
                "\"Default MCP servers ship without fine-grained RBAC, audit logging, or tool-description signing—one "
                "poisoned Jira ticket can hijack a privileged database tool call.\""
            ),
            "claim_production": (
                "Block, Apollo, and 14 Fortune 500 engineering orgs standardized on centrally signed MCP HTTP Gateways "
                "with OAuth 2.1 On-Behalf-Of (OBO) token scoping, cutting integration maintenance by 71%."
            ),
        },
        {
            "id": "node-eu-ai-act-gpai-audit",
            "slug": "eu-ai-act-nist-sr11-7-governance",
            "title": "EU AI Act High-Risk & GPAI Enforcement + OCC SR 11-7 Harmonization",
            "industry_verticals": ["Financial Services", "Healthcare & Life Sciences", "Legal/Professional Services", "Cross-Industry Horizontal"],
            "maturity_stage": "production_scale",
            "base_signal_score": 81.0,
            "consultant_weight": 1.4,
            "adoption_velocity": 78.0,
            "verified_roi_score": 68.0,
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "summary_executive": (
                "With EU AI Act High-Risk and GPAI transparency obligations actively enforced alongside US OCC SR 11-7 "
                "and FDA PCCP rules, Fortune 500 boards now mandate automated lineage, immutable citation provenance, "
                "and red-team evaluation gates before production promotion—blocking 38% of unverified pilots."
            ),
            "summary_technical": (
                "Requires cryptographic binding of prompt templates, model weights hash, retrieved citation chunk IDs, "
                "and deterministic eval harnesses mapped to NIST AI RMF 1.0 and EU AI Act Annex IV technical "
                "documentation schemas."
            ),
            "summary_contrarian": (
                "Static PDF compliance checklists and third-party 'AI GRC' dashboards add 4 months of procurement delay "
                "without catching runtime drift; only CI/CD-embedded telemetry and citation-locked retrieval pass "
                "actual regulatory inspection."
            ),
            "claim_vendor": (
                "\"One-click EU AI Act certification badge via automated policy questionnaire generation.\""
            ),
            "claim_builder": (
                "\"Auditors reject synthetic self-assessments; they demand immutable runtime logs showing exact source "
                "chunks, model version hashes, and deterministic fallback behavior.\""
            ),
            "claim_production": (
                "European banking & life-sciences deployments using automated Annex IV telemetry pipelines reduced "
                "regulatory sign-off cycles from 19 weeks to 3.5 weeks."
            ),
        },
        {
            "id": "node-healthcare-ambient-samd",
            "slug": "mayo-epic-clinical-ambient-prior-auth",
            "title": "Clinical Ambient Scribing & Autonomous Prior-Authorization (FDA SaMD)",
            "industry_verticals": ["Healthcare & Life Sciences"],
            "maturity_stage": "production_scale",
            "base_signal_score": 85.0,
            "consultant_weight": 1.3,
            "adoption_velocity": 84.0,
            "verified_roi_score": 88.0,
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "summary_executive": (
                "Health systems (Mayo Clinic, Kaiser, Sutter) report ambient clinical documentation and automated "
                "payer prior-authorization are the two highest-ROI enterprise AI workloads in healthcare—recovering "
                "1.4 hours per physician daily and reducing prior-auth denial write-offs by 34%."
            ),
            "summary_technical": (
                "Uses fine-tuned medical ASR + FHIR R4 structured extraction with mandatory sentence-level audio-span "
                "grounding back to the patient encounter transcript, running inside HIPAA-BAA isolated VPCs with "
                "FDA Predetermined Change Control Plan (PCCP) drift monitoring."
            ),
            "summary_contrarian": (
                "Standalone ambient scribe startups face brutal commoditization as Epic and Oracle Health bundle native "
                "scribing; sustainable margin exists only in revenue-cycle prior-authorization and clinical trial "
                "cohort matching."
            ),
            "claim_vendor": (
                "\"Autonomous clinical diagnostic agent replaces specialist triage with 99% USMLE accuracy.\""
            ),
            "claim_builder": (
                "\"USMLE multiple-choice scores do not translate to messy longitudinal EHR charts; ungrounded clinical "
                "summaries fabricate medication dosages unless constrained to extractive FHIR spans.\""
            ),
            "claim_production": (
                "Multi-center deployment across 18,000 clinicians demonstrated 41% reduction in after-hours 'pajama time' "
                "EHR charting and 3.8x faster insurance prior-auth turnaround."
            ),
        },
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
            "claim_vendor": (
                "\"Zero-shot cloud LLM autonomously controls factory robotics and optimizes global logistics.\""
            ),
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
            "claim_vendor": (
                "\"Conversational AI shopping concierges will replace search bars and double e-commerce conversion.\""
            ),
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
            "claim_vendor": (
                "\"Upload a 5,000-file M&A data room into a 2M-token context window and get instant risk summaries.\""
            ),
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
            "claim_vendor": (
                "\"You need a dedicated managed vector database and a separate graph database cluster for enterprise RAG.\""
            ),
            "claim_builder": (
                "\"Syncing RBAC/RLS permissions across Postgres, Pinecone, and Neo4j is an operational nightmare that "
                "inevitably leaks cross-tenant embeddings during permission revocations.\""
            ),
            "claim_production": (
                "Benchmarks across 6 Fortune 500 advisory engagements confirm Postgres 17 + pgvector + AGE delivers "
                "sub-28ms hybrid vector+Cypher retrieval at 50M vectors with zero ACL drift and 64% lower infra spend."
            ),
        },
        # Foreign tenant private node to prove RLS isolation!
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

    for n in nodes_data:
        embed_text = f"{n['title']} {n['summary_executive']} {n['summary_technical']} {' '.join(n['industry_verticals'])}"
        session.add(
            CanonicalNode(
                id=n["id"],
                slug=n["slug"],
                title=n["title"],
                summary_executive=n["summary_executive"],
                summary_technical=n["summary_technical"],
                summary_contrarian=n["summary_contrarian"],
                claim_vendor=n["claim_vendor"],
                claim_builder=n["claim_builder"],
                claim_production=n["claim_production"],
                industry_verticals=n["industry_verticals"],
                maturity_stage=n["maturity_stage"],
                base_signal_score=n["base_signal_score"],
                consultant_weight=n["consultant_weight"],
                adoption_velocity=n["adoption_velocity"],
                verified_roi_score=n["verified_roi_score"],
                visibility=n["visibility"],
                owner_org_id=n["owner_org_id"],
                owner_user_id=n["owner_user_id"],
                embedding=deterministic_embedding_1536(embed_text),
            )
        )

    # -------------------------------------------------------------------------
    # 3. Seed Primary Evidence Citations (`node_sources`) — Public + Subscriber Licensed
    # -------------------------------------------------------------------------
    sources_data = [
        # Node 1: JPM / Stripe Agentic KYC
        {
            "node_id": "node-jpm-agentic-kyc",
            "source_type": "sec_filing",
            "source_name": "JPMorgan Chase & Co. Form 10-K / Annual Shareholder Letter (AI Operations Disclosure)",
            "author_handle": "SEC EDGAR CIK 0000019617",
            "authority_tier": 1,
            "direct_url": "https://www.sec.gov/edgar/browse/?CIK=0000019617",
            "exact_quote": (
                "Production AI and deterministic workflow automation across KYC, AML entity resolution, and fraud "
                "risk operations reduced manual L1/L2 exception queues by 62%, delivering over $140M in verified "
                "annualized run-rate efficiencies under SR 11-7 model governance."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=2),
        },
        {
            "node_id": "node-jpm-agentic-kyc",
            "source_type": "newsletter",
            "source_name": "The Pragmatic Engineer (Paid Subscriber Issue via intel+erik@ingest.vectra.ai)",
            "author_handle": "@GergelyOrosz",
            "authority_tier": 2,
            "direct_url": "https://newsletter.pragmaticengineer.com/p/inside-stripe-and-jpm-ai-agents",
            "exact_quote": (
                "[SUBSCRIBER EXCLUSIVE] Principal architects at Stripe and JPMorgan confirmed they ripped out "
                "autonomous multi-agent loops after Q2 latency blowups, replacing them with Temporal-orchestrated "
                "state machines and grammar-constrained vLLM verifiers."
            ),
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "vectra-advisory",
            "owner_user_id": "erik",
            "published_at": now - timedelta(days=1),
        },
        # Node 2: vLLM Disaggregated Serving
        {
            "node_id": "node-vllm-disaggregated-serving",
            "source_type": "eng_blog",
            "source_name": "Stripe & vLLM Production Systems Engineering Blog",
            "author_handle": "@vllm_project",
            "authority_tier": 1,
            "direct_url": "https://blog.vllm.ai/2026/disaggregated-prefill-decode-production",
            "exact_quote": (
                "Decoupling prefill and decode instances with RDMA-backed KV-cache transfer reduced p99 Time-To-First-Token "
                "by 68% on 32k-token enterprise RAG prompts and lowered GPU cluster TCO by 52%."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(hours=18),
        },
        {
            "node_id": "node-vllm-disaggregated-serving",
            "source_type": "x_thread",
            "source_name": "Erik's Private X Bookmark — Principal Inference Architect Thread",
            "author_handle": "@carro_llm_infra",
            "authority_tier": 2,
            "direct_url": "https://x.com/carro_llm_infra/status/1894412098412",
            "exact_quote": (
                "[X BOOKMARK SYNC] Warning for CTOs deploying disaggregated prefill/decode: do NOT enable cross-node KV "
                "routing over standard AWS ENA 25GbE—you need EFA/RDMA or at minimum 100GbE with prefix-locality hashing, "
                "otherwise network serialization eats 40% of your ITL gains."
            ),
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "vectra-advisory",
            "owner_user_id": "erik",
            "published_at": now - timedelta(hours=9),
        },
        # Node 3: MCP Zero-Trust Enterprise Gateway
        {
            "node_id": "node-mcp-enterprise-gateway",
            "source_type": "github",
            "source_name": "Model Context Protocol Specification — Enterprise OAuth 2.1 Streamable HTTP",
            "author_handle": "modelcontextprotocol/specification",
            "authority_tier": 1,
            "direct_url": "https://github.com/modelcontextprotocol/specification",
            "exact_quote": (
                "Enterprise deployments MUST enforce OAuth 2.1 resource-indicators, signed tool definitions, and "
                "per-request tenant context headers across Streamable HTTP gateways to prevent cross-tool confused-deputy "
                "attacks."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=3),
        },
        {
            "node_id": "node-mcp-enterprise-gateway",
            "source_type": "newsletter",
            "source_name": "Latent Space VIP Dispatch (Forwarded to intel+erik@ingest.vectra.ai)",
            "author_handle": "@swyx",
            "authority_tier": 2,
            "direct_url": "https://www.latent.space/p/mcp-enterprise-security-gateways",
            "exact_quote": (
                "[SUBSCRIBER LICENSED] Three Fortune 100 CISOs blocked local stdio MCP servers last month after red-teams "
                "demonstrated indirect prompt injection via poisoned Confluence pages triggering unauthorized GitHub PR merges."
            ),
            "provenance_license": "subscriber_licensed",
            "visibility": "user_private",
            "owner_org_id": "vectra-advisory",
            "owner_user_id": "erik",
            "published_at": now - timedelta(days=1, hours=6),
        },
        # Node 4: EU AI Act & SR 11-7 Governance
        {
            "node_id": "node-eu-ai-act-gpai-audit",
            "source_type": "regulatory",
            "source_name": "EU AI Office & NIST AI RMF Joint Enforcement Directive (Annex IV)",
            "author_handle": "EU-AI-Office / NIST",
            "authority_tier": 1,
            "direct_url": "https://artificialintelligenceact.eu/high-risk-annex-iv-enforcement/",
            "exact_quote": (
                "Deployers of high-risk AI systems in banking, credit scoring, healthcare triage, and legal evaluation "
                "must maintain immutable runtime logs linking generated outputs to primary source provenance and model "
                "revision hashes."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=4),
        },
        # Node 5: Healthcare Ambient Scribe & Prior-Auth
        {
            "node_id": "node-healthcare-ambient-samd",
            "source_type": "regulatory",
            "source_name": "Mayo Clinic Proceedings & FDA Digital Health Center of Excellence (PCCP)",
            "author_handle": "FDA-DHCoE / MayoClinic",
            "authority_tier": 1,
            "direct_url": "https://www.fda.gov/medical-devices/software-medical-device-samd",
            "exact_quote": (
                "Across 18,400 ambulatory physicians, FHIR-grounded ambient documentation coupled with automated payer "
                "prior-authorization packet assembly cut clinician documentation burden by 1.4 hours/day and reduced "
                "initial payer denials by 34%."
            ),
            "provenance_license": "public",
            "visibility": "global",
            "owner_org_id": "global",
            "owner_user_id": "system",
            "published_at": now - timedelta(days=3),
        },
        # Node 6: Siemens Industrial Copilot
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
        # Node 7: Walmart Retail Supply Chain Mesh
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
        # Node 8: Harvey / Legal Redlining
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
        # Node 9: Hybrid GraphRAG with PostgreSQL 17 (pgvector + Apache AGE)
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
        # Foreign tenant private source (should be hidden from Erik by RLS)
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

    for s in sources_data:
        session.add(NodeSource(**s))

    # -------------------------------------------------------------------------
    # 4. Seed Associative Knowledge Graph Edges (`associative_edges`)
    # -------------------------------------------------------------------------
    edges_data = [
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

    for e in edges_data:
        session.add(AssociativeEdge(**e))

    # -------------------------------------------------------------------------
    # 5. Seed Erik's Private Obsidian Consultant Notes (`consultant_notes`)
    # -------------------------------------------------------------------------
    notes_data = [
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

    for note in notes_data:
        links = extract_wikilinks(note["markdown_content"])
        session.add(
            ConsultantNote(
                node_id=note["node_id"],
                owner_user_id=note["owner_user_id"],
                owner_org_id=note["owner_org_id"],
                visibility=note["visibility"],
                markdown_content=note["markdown_content"],
                extracted_wikilinks=links,
            )
        )

    await session.commit()
    return {"seeded": len(nodes_data)}
