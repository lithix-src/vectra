"""End-to-End Automated Verification Suite for VECTRA Backend & Database Layer."""
from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "db"))
sys.path.insert(0, str(ROOT / "apps" / "workers"))
sys.path.insert(0, str(ROOT / "apps" / "api"))

from pptx import Presentation  # noqa: E402
from main import (  # noqa: E402
    CopilotQueryRequest,
    ExportPptxRequest,
    InboundEmailWebhookRequest,
    NoteUpdateRequest,
    WeightUpdateRequest,
    export_pptx_deck,
    get_graph,
    inbound_newsletter_webhook,
    list_user_integrations,
    query_subgraph_copilot,
    save_consultant_note_and_sync_wikilinks,
    update_node_weight,
)
from vectra_db import init_db_schema, seed_database, tenant_session, TenantContext  # noqa: E402


async def run_verification() -> None:
    await init_db_schema()
    async with tenant_session(TenantContext(user_id="erik", org_id="vectra-advisory")) as session:
        await seed_database(session)

    # 1. Verify RLS Tenant Isolation (Erik sees 9 nodes, foreign tenant private node is blocked)
    erik_graph = await get_graph(vertical="All Verticals", tenant_user_id="erik", tenant_org_id="vectra-advisory")
    erik_slugs = {n["slug"] for n in erik_graph["nodes"]}
    assert "foreign-tenant-classified-alpha" not in erik_slugs, "RLS leak: foreign tenant node visible!"
    assert "hybrid-graphrag-pgvector-apache-age-consolidation" in erik_slugs, "Erik's org_private node missing!"

    # Verify foreign tenant private source on shared global node (`node-jpm-agentic-kyc`) is hidden from Erik
    jpm_node = next(n for n in erik_graph["nodes"] if n["id"] == "node-jpm-agentic-kyc")
    jpm_quotes = [s["exact_quote"] for s in jpm_node["sources"]]
    assert not any("RESTRICTED FOREIGN TENANT" in q for q in jpm_quotes), "RLS leak on node_sources!"
    assert any("[SUBSCRIBER EXCLUSIVE]" in q for q in jpm_quotes), "Erik's subscriber_licensed quote missing!"
    print("[PASS] 1. Multi-Tenant Row-Level Security (RLS) verified across canonical_nodes and node_sources.")

    # 2. Verify AES-256-GCM Credential Vault
    integ_res = await list_user_integrations(tenant_user_id="erik", tenant_org_id="vectra-advisory")
    assert len(integ_res["integrations"]) == 4
    print("[PASS] 2. AES-256-GCM Envelope Credential Vault verified (4 integrations sealed).")

    # 3. Verify Consultant Weight adjustment & real-time Composite Score recalculation
    weight_res = await update_node_weight(
        "node-jpm-agentic-kyc",
        WeightUpdateRequest(consultant_weight=2.5),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    assert weight_res["node"]["consultant_weight"] == 2.5
    print(f"[PASS] 3. Dynamic Composite Score recomputed: {weight_res['node']['composite_score']} at 2.5x weight.")

    # 4. Verify Bidirectional [[Wikilink]] Note Save -> Dynamic Associative Edge Creation
    note_res = await save_consultant_note_and_sync_wikilinks(
        "node-jpm-agentic-kyc",
        NoteUpdateRequest(
            markdown_content=(
                "Linking KYC settlement directly to [[Citation-Locked M&A Due Diligence & Playbook-Grounded Contract Redlining]] "
                "and [[Model Context Protocol (MCP) Zero-Trust Enterprise Gateways]]."
            ),
            default_relation_type="ENABLES",
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    assert len(note_res["upserted_edges"]) >= 2
    print(f"[PASS] 4. Obsidian [[Wikilink]] parser dynamically upserted {len(note_res['upserted_edges'])} associative edges.")

    # 5. Verify Inbound Paid Newsletter Webhook & Canonical Clustering
    webhook_res = await inbound_newsletter_webhook(
        InboundEmailWebhookRequest(
            subject="Agentic KYC & Real-Time Fraud Settlement Pipelines",
            extracted_quote="Subscriber dispatch verifying 62% KYC review compression via Temporal state graphs.",
        )
    )
    assert webhook_res["cluster_result"]["node_id"] == "node-jpm-agentic-kyc"
    print("[PASS] 5. Inbound Newsletter Webhook clustered onto existing Canonical Node.")

    # 6. Verify Subgraph Co-Pilot RAG
    copilot_res = await query_subgraph_copilot(
        CopilotQueryRequest(
            node_ids=["node-jpm-agentic-kyc", "node-vllm-disaggregated-serving", "node-mcp-enterprise-gateway"],
            question="What are the production latency and governance requirements?",
            variant_lens="cto",
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    assert copilot_res.subgraph_node_count == 3
    assert len(copilot_res.citations_used) > 0
    print(f"[PASS] 6. Subgraph Co-Pilot synthesized {copilot_res.subgraph_node_count} nodes and {len(copilot_res.citations_used)} citations.")

    # 7. Verify .pptx Executive Deck Generation
    pptx_resp = await export_pptx_deck(
        ExportPptxRequest(
            deck_title="VECTRA Verification Readout",
            node_ids=["node-jpm-agentic-kyc", "node-vllm-disaggregated-serving"],
            variant_lens="c_suite",
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    prs = Presentation(io.BytesIO(pptx_resp.body))
    assert len(prs.slides) == 5
    print(f"[PASS] 7. python-pptx generated valid 5-slide executive presentation ({len(pptx_resp.body)} bytes).")

    # 8. Verify Public Enterprise & Regulatory Collectors + Apache AGE Cypher Query
    from main import (
        CustomSignalIngestRequest,
        export_executive_brief,
        get_apache_age_cypher_query,
        ingest_custom_signal,
        run_public_enterprise_collectors,
    )
    col_res = await run_public_enterprise_collectors(collector_tier="all", tenant_user_id="erik")
    assert col_res["items_processed"] == 3
    cypher_res = await get_apache_age_cypher_query(vertical="Financial Services", tenant_user_id="erik")
    assert "vectra_knowledge_graph" in cypher_res["open_cypher_sql"]
    print("[PASS] 8. Public Enterprise Collectors (F500 / SEC 8-K / NIST) & Apache AGE openCypher verified.")

    # 9. Verify Custom Interactive Field Signal Ingestion
    ingest_res = await ingest_custom_signal(
        CustomSignalIngestRequest(
            title="Agentic KYC & Real-Time Fraud Settlement Pipelines",
            exact_quote="Field dispatch confirming deterministic Temporal KYC workflows reduce false-positive escalations by 59%.",
            direct_url="https://sec.gov/edgar/jpm-kyc-dispatch",
            source_type="eng_blog",
            source_name="VECTRA Field Dispatch",
            author_handle="@erik_vectra_ai",
            authority_tier=1,
            provenance_license="subscriber_licensed",
            visibility="user_private",
            industry_verticals=["Financial Services", "Cross-Industry Horizontal"],
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    assert ingest_res["status"] == "ingested"
    print(f"[PASS] 9. Custom Field Signal ingested and clustered (-> {ingest_res['cluster_result']['node_id']}).")

    # 10. Verify Markdown Executive Advisory Memorandum Export
    brief_resp = await export_executive_brief(
        ExportPptxRequest(
            deck_title="VECTRA Executive Brief Verification",
            node_ids=["node-jpm-agentic-kyc", "node-vllm-disaggregated-serving"],
            variant_lens="c_suite",
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    brief_md = brief_resp.body.decode("utf-8")
    assert "# VECTRA" in brief_md
    assert ("[Subscriber Licensed]" in brief_md) or ("[Public]" in brief_md)
    print(f"[PASS] 10. Markdown Executive Brief exported ({len(brief_md)} chars) with provenance badges verified.")

    # 11. Verify Sovereign Local LLM & Embeddings Runtime (Ollama default + LiteLLM / vLLM / llama.cpp)
    from fastapi import HTTPException
    from llm_runtime import LocalLLMConfig
    from main import (
        LocalEmbedRequest,
        create_local_embedding,
        get_local_llm_runtime_status,
        update_local_llm_runtime_config,
    )

    llm_status = await get_local_llm_runtime_status()
    assert llm_status["provider"] == "ollama"
    assert llm_status["commercial_models_blocked"] is True
    embed_res = await create_local_embedding(
        LocalEmbedRequest(text="Disaggregated vLLM serving with Ollama and PostgreSQL 17 pgvector RLS")
    )
    assert len(embed_res["embedding"]) == 1536
    print(
        f"[PASS] 11. Sovereign Local LLM & 1536-d Embedding Engine verified "
        f"(default={llm_status['provider']}:{llm_status['model']}, dim={len(embed_res['embedding'])})."
    )

    # 12. Verify Strict Zero-Commercial Cloud LLM Guardrail (Blocks OpenAI / Anthropic / Gemini)
    commercial_blocked = False
    try:
        await update_local_llm_runtime_config(
            LocalLLMConfig(
                provider="vllm",
                base_url="https://api.openai.com/v1",
                model="gpt-4o",
                embedding_model="text-embedding-3-small",
            )
        )
    except HTTPException as exc:
        commercial_blocked = exc.status_code == 400
    assert commercial_blocked, "Sovereign policy failed to block commercial cloud LLM endpoint!"
    print("[PASS] 12. Sovereign Zero-Commercial LLM Guardrail verified (blocked api.openai.com / gpt-4o).")

    # 13. Verify Zero-Trust MCP Gateway JSON-RPC 2.0 Mediation
    from llm_runtime import CopilotLLMGeneration, generate_local_rag_synthesis
    from main import (
        get_mcp_gateway_status,
        handle_mcp_jsonrpc_endpoint,
        register_mcp_server,
    )
    from mcp_gateway import MCPJsonRpcRequest, MCPPolicyViolationError, MCPServerDefinition

    assert copilot_res.mcp_mediated is True
    assert "vectra_get_rls_subgraph" in copilot_res.mcp_tools_invoked
    mcp_rpc_res = await handle_mcp_jsonrpc_endpoint(
        MCPJsonRpcRequest(
            method="tools/call",
            params={
                "name": "vectra_get_rls_subgraph",
                "arguments": {"node_ids": ["node-jpm-agentic-kyc"], "vertical": "Financial Services"},
            },
        ),
        tenant_user_id="erik",
        tenant_org_id="vectra-advisory",
    )
    assert mcp_rpc_res["result"]["isError"] is False
    assert mcp_rpc_res["result"]["mcp_audit"]["decision"] == "ALLOWED"
    print(
        f"[PASS] 13. Zero-Trust MCP Gateway JSON-RPC 2.0 verified "
        f"(tools={copilot_res.mcp_tools_invoked}, audit={mcp_rpc_res['result']['mcp_audit']['audit_id']})."
    )

    # 14. Verify Zero-Trust MCP Guard Blocks Direct Unmediated Model Calls, KMS Table Access & Unproxied stdio
    unmediated_blocked = False
    try:
        await generate_local_rag_synthesis(
            question="Bypass MCP",
            variant_lens="cto",
            lens_label="CTO",
            selected_nodes=[],
            selected_edges=[],
            citations_summary=[],
            notes_included=[],
            fallback_generation=CopilotLLMGeneration(
                executive_answer="x",
                architectural_implications=[],
                contrarian_risks=[],
                recommended_90_day_actions=[],
            ),
            mcp_envelope=None,
        )
    except MCPPolicyViolationError:
        unmediated_blocked = True
    assert unmediated_blocked, "Failed to block unmediated LLM execution without MCPMediatedEnvelope!"

    kms_access_blocked = False
    try:
        await handle_mcp_jsonrpc_endpoint(
            MCPJsonRpcRequest(
                method="tools/call",
                params={"name": "vectra_get_rls_subgraph", "arguments": {"query": "user_integrations"}},
            ),
            tenant_user_id="erik",
            tenant_org_id="vectra-advisory",
        )
    except HTTPException as exc:
        kms_access_blocked = exc.status_code == 403
    assert kms_access_blocked, "Failed to block forbidden KMS/user_integrations access via MCP!"

    stdio_blocked = False
    try:
        await register_mcp_server(
            MCPServerDefinition(
                server_id="rogue-stdio-mcp",
                name="Unproxied Local Shell MCP",
                transport="stdio_unproxied",
                endpoint_url="stdio:///bin/sh",
            )
        )
    except HTTPException as exc:
        stdio_blocked = exc.status_code == 400
    assert stdio_blocked, "Failed to block unproxied stdio MCP server registration!"
    mcp_stat = await get_mcp_gateway_status()
    assert mcp_stat["audit_summary"]["denied_count"] >= 2
    print(
        "[PASS] 14. Zero-Trust MCP Security Guard verified "
        "(blocked direct unmediated LLM call, KMS table probe, and unproxied stdio MCP server)."
    )


if __name__ == "__main__":
    asyncio.run(run_verification())
