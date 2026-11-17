"""Core Horizontal, Infrastructure, Governance & Healthcare Seed Fixtures (Nodes 1–5)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

CORE_NODES_SEED: List[Dict[str, Any]] = [
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
        "claim_vendor": "\"Plug any enterprise database into any LLM agent in 5 minutes with universal MCP servers.\"",
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
        "industry_verticals": [
            "Financial Services",
            "Healthcare & Life Sciences",
            "Legal/Professional Services",
            "Cross-Industry Horizontal",
        ],
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
        "claim_vendor": "\"One-click EU AI Act certification badge via automated policy questionnaire generation.\"",
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
        "claim_vendor": "\"Autonomous clinical diagnostic agent replaces specialist triage with 99% USMLE accuracy.\"",
        "claim_builder": (
            "\"USMLE multiple-choice scores do not translate to messy longitudinal EHR charts; ungrounded clinical "
            "summaries fabricate medication dosages unless constrained to extractive FHIR spans.\""
        ),
        "claim_production": (
            "Multi-center deployment across 18,000 clinicians demonstrated 41% reduction in after-hours 'pajama time' "
            "EHR charting and 3.8x faster insurance prior-auth turnaround."
        ),
    },
]


def get_core_sources_seed(now: datetime) -> List[Dict[str, Any]]:
    """Primary public & subscriber-licensed evidence citations for Nodes 1–5."""
    return [
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
    ]
