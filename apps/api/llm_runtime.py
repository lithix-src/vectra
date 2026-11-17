"""Sovereign Local-First LLM & Embeddings Execution Engine (`apps/api/llm_runtime.py`).

Imports policy guardrails, schemas, and vector projection from `llm_policy.py` and executes:
1. `probe_local_llm_status()` — Live discovery against Ollama / LiteLLM / vLLM / llama.cpp / LM Studio.
2. `embed_text_local_1536()` — Local embedding computation projected to 1536-d with deterministic fallback.
3. `generate_local_rag_synthesis()` — MCP-envelope-verified structured JSON RAG synthesis.
"""
from __future__ import annotations

import json
import time
from typing import Any, Dict, List

import httpx
from llm_policy import (
    FORBIDDEN_COMMERCIAL_HOSTS,
    FORBIDDEN_COMMERCIAL_MODEL_PREFIXES,
    PROVIDER_DEFAULTS,
    CommercialModelPolicyError,
    CopilotLLMGeneration,
    LocalLLMConfig,
    LocalProviderType,
    SovereignPolicyViolationError,
    get_active_llm_config,
    project_vector_to_1536,
    set_active_llm_config,
    validate_sovereign_local_policy,
)
from vectra_db import EMBEDDING_DIM, deterministic_embedding_1536


async def probe_local_llm_status(config: LocalLLMConfig | None = None) -> Dict[str, Any]:
    """Probe the configured local LLM daemon (Ollama / LiteLLM / vLLM / llama.cpp) and list available models."""
    cfg = config or get_active_llm_config()
    validate_sovereign_local_policy(cfg)
    start = time.perf_counter()
    discovered_models: List[str] = []
    daemon_online = False
    status_detail = ""

    try:
        async with httpx.AsyncClient(timeout=min(cfg.timeout_seconds, 2.0)) as client:
            if cfg.provider == "ollama":
                resp = await client.get(f"{cfg.base_url}/api/tags")
                if resp.status_code == 200:
                    daemon_online = True
                    data = resp.json()
                    discovered_models = [
                        m.get("name", "") for m in data.get("models", []) if m.get("name")
                    ]
                    status_detail = f"Ollama daemon online at {cfg.base_url} ({len(discovered_models)} local models)"
                else:
                    status_detail = f"Ollama returned HTTP {resp.status_code}"
            else:
                models_url = (
                    f"{cfg.base_url}/models"
                    if cfg.base_url.endswith("/v1")
                    else f"{cfg.base_url}/v1/models"
                )
                resp = await client.get(models_url)
                if resp.status_code == 200:
                    daemon_online = True
                    data = resp.json()
                    discovered_models = [
                        m.get("id", "") for m in data.get("data", []) if m.get("id")
                    ]
                    status_detail = f"{cfg.provider} online at {cfg.base_url} ({len(discovered_models)} local models)"
                else:
                    status_detail = f"{cfg.provider} returned HTTP {resp.status_code}"
    except Exception as exc:
        status_detail = (
            f"Local daemon at {cfg.base_url} not currently reachable ({exc.__class__.__name__}). "
            "Using deterministic local fallback until local server is started."
        )

    latency_ms = round((time.perf_counter() - start) * 1000.0, 1)
    defaults = PROVIDER_DEFAULTS.get(cfg.provider, PROVIDER_DEFAULTS["ollama"])
    return {
        "provider": cfg.provider,
        "provider_label": defaults["label"],
        "base_url": cfg.base_url,
        "model": cfg.model,
        "embedding_model": cfg.embedding_model,
        "temperature": cfg.temperature,
        "daemon_online": daemon_online,
        "execution_mode": "local_llm" if daemon_online else "deterministic_local_fallback",
        "commercial_models_blocked": cfg.block_commercial_models,
        "discovered_models": discovered_models,
        "recommended_models": defaults["recommended_models"],
        "supported_providers": PROVIDER_DEFAULTS,
        "probe_latency_ms": latency_ms,
        "status_detail": status_detail,
    }


async def embed_text_local_1536(
    text: str,
    config: LocalLLMConfig | None = None,
) -> Dict[str, Any]:
    """Generate a 1536-dim vector using the configured local embedding model with deterministic fallback."""
    cfg = config or get_active_llm_config()
    validate_sovereign_local_policy(cfg)
    start = time.perf_counter()

    try:
        async with httpx.AsyncClient(timeout=min(cfg.timeout_seconds, 3.0)) as client:
            if cfg.provider == "ollama":
                resp = await client.post(
                    f"{cfg.base_url}/api/embed",
                    json={"model": cfg.embedding_model, "input": text},
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    embeddings = payload.get("embeddings") or []
                    raw_vec = embeddings[0] if embeddings else payload.get("embedding", [])
                    if raw_vec:
                        vec_1536 = project_vector_to_1536(raw_vec, EMBEDDING_DIM)
                        return {
                            "embedding": vec_1536,
                            "source_dimension": len(raw_vec),
                            "target_dimension": len(vec_1536),
                            "provider": cfg.provider,
                            "embedding_model": cfg.embedding_model,
                            "execution_mode": "local_embedding_model",
                            "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
                        }
            else:
                embed_url = (
                    f"{cfg.base_url}/embeddings"
                    if cfg.base_url.endswith("/v1")
                    else f"{cfg.base_url}/v1/embeddings"
                )
                resp = await client.post(
                    embed_url,
                    json={"model": cfg.embedding_model, "input": text},
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    data = payload.get("data") or []
                    raw_vec = data[0].get("embedding", []) if data else []
                    if raw_vec:
                        vec_1536 = project_vector_to_1536(raw_vec, EMBEDDING_DIM)
                        return {
                            "embedding": vec_1536,
                            "source_dimension": len(raw_vec),
                            "target_dimension": len(vec_1536),
                            "provider": cfg.provider,
                            "embedding_model": cfg.embedding_model,
                            "execution_mode": "local_embedding_model",
                            "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
                        }
    except Exception:
        pass

    fallback_vec = deterministic_embedding_1536(text, dim=EMBEDDING_DIM)
    return {
        "embedding": fallback_vec,
        "source_dimension": EMBEDDING_DIM,
        "target_dimension": EMBEDDING_DIM,
        "provider": cfg.provider,
        "embedding_model": "deterministic-trigram-1536 (local fallback)",
        "execution_mode": "deterministic_local_fallback",
        "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
    }


async def generate_local_rag_synthesis(
    *,
    question: str,
    variant_lens: str,
    lens_label: str,
    selected_nodes: List[Dict[str, Any]],
    selected_edges: List[Dict[str, Any]],
    citations_summary: List[Dict[str, Any]],
    notes_included: List[str],
    fallback_generation: CopilotLLMGeneration,
    mcp_envelope: Any = None,
    config: LocalLLMConfig | None = None,
) -> Dict[str, Any]:
    """Execute grammar-constrained Subgraph RAG synthesis against local Ollama / LiteLLM / vLLM / llama.cpp."""
    from mcp_gateway import verify_mcp_envelope

    verify_mcp_envelope(mcp_envelope)
    cfg = config or get_active_llm_config()
    validate_sovereign_local_policy(cfg)
    start = time.perf_counter()

    nodes_context = "\n".join(
        f"- [{n['id']}] {n['title']} (Composite Score: {n['composite_score']}, ROI: {n['verified_roi_score']})\n"
        f"  Executive: {n['summary_executive']}\n"
        f"  Technical: {n['summary_technical']}\n"
        f"  Contrarian: {n['summary_contrarian']}\n"
        f"  Builder Reality: {n['claim_builder']} | Production Proof: {n['claim_production']}"
        for n in selected_nodes
    )
    edges_context = "\n".join(
        f"- {e['source_node_id']} --[{e['relation_type']} (w={e['weight']})]--> {e['target_node_id']}"
        for e in selected_edges
    )
    citations_context = "\n".join(
        f"- [{c['provenance_license'].upper()}] {c['source_name']} ({c['direct_url']}): \"{c['exact_quote']}\""
        for c in citations_summary[:12]
    )
    notes_context = "\n".join(f"- {note}" for note in notes_included) or "None provided."

    system_prompt = (
        "You are VECTRA Subgraph Co-Pilot, a sovereign local-only enterprise AI advisory engine. "
        "Synthesize strictly from the provided canonical nodes, associative edges, verbatim primary citations, "
        "and private consultant field notes. Respond ONLY with valid JSON matching the required schema: "
        "{executive_answer: str, architectural_implications: list[str], contrarian_risks: list[str], "
        "recommended_90_day_actions: list[str]}."
    )
    user_prompt = (
        f"Active Variant Lens: {variant_lens} ({lens_label})\n"
        f"Advisory Question: {question}\n\n"
        f"=== LASSOED CANONICAL NODES ({len(selected_nodes)}) ===\n{nodes_context}\n\n"
        f"=== INCIDENT ASSOCIATIVE EDGES ({len(selected_edges)}) ===\n{edges_context}\n\n"
        f"=== VERIFIED PRIMARY CITATIONS ({len(citations_summary)}) ===\n{citations_context}\n\n"
        f"=== PRIVATE CONSULTANT FIELD NOTES ===\n{notes_context}\n"
    )

    try:
        req_timeout = httpx.Timeout(cfg.timeout_seconds, connect=min(cfg.timeout_seconds, 2.0))
        async with httpx.AsyncClient(timeout=req_timeout) as client:
            if cfg.provider == "ollama":
                resp = await client.post(
                    f"{cfg.base_url}/api/chat",
                    json={
                        "model": cfg.model,
                        "stream": False,
                        "format": CopilotLLMGeneration.model_json_schema(),
                        "options": {"temperature": cfg.temperature},
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if resp.status_code == 200:
                    body = resp.json()
                    content_str = body.get("message", {}).get("content", "")
                    parsed = CopilotLLMGeneration.model_validate_json(content_str)
                    return {
                        "generation": parsed,
                        "llm_provider": cfg.provider,
                        "llm_model": cfg.model,
                        "execution_mode": "local_llm",
                        "commercial_models_blocked": cfg.block_commercial_models,
                        "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
                    }
            else:
                chat_url = (
                    f"{cfg.base_url}/chat/completions"
                    if cfg.base_url.endswith("/v1")
                    else f"{cfg.base_url}/v1/chat/completions"
                )
                resp = await client.post(
                    chat_url,
                    json={
                        "model": cfg.model,
                        "temperature": cfg.temperature,
                        "response_format": {
                            "type": "json_schema",
                            "json_schema": {
                                "name": "CopilotLLMGeneration",
                                "schema": CopilotLLMGeneration.model_json_schema(),
                            },
                        },
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if resp.status_code == 200:
                    body = resp.json()
                    choices = body.get("choices") or []
                    content_str = choices[0].get("message", {}).get("content", "") if choices else ""
                    if isinstance(content_str, str) and content_str.strip():
                        cleaned = content_str.strip()
                        if cleaned.startswith("```"):
                            cleaned = cleaned.strip("`").removeprefix("json").strip()
                        parsed = CopilotLLMGeneration.model_validate(json.loads(cleaned))
                        return {
                            "generation": parsed,
                            "llm_provider": cfg.provider,
                            "llm_model": cfg.model,
                            "execution_mode": "local_llm",
                            "commercial_models_blocked": cfg.block_commercial_models,
                            "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
                        }
    except Exception:
        pass

    return {
        "generation": fallback_generation,
        "llm_provider": cfg.provider,
        "llm_model": cfg.model,
        "execution_mode": "deterministic_local_fallback",
        "commercial_models_blocked": cfg.block_commercial_models,
        "latency_ms": round((time.perf_counter() - start) * 1000.0, 1),
    }


__all__ = [
    "CommercialModelPolicyError",
    "CopilotLLMGeneration",
    "FORBIDDEN_COMMERCIAL_HOSTS",
    "FORBIDDEN_COMMERCIAL_MODEL_PREFIXES",
    "LocalLLMConfig",
    "LocalProviderType",
    "PROVIDER_DEFAULTS",
    "SovereignPolicyViolationError",
    "embed_text_local_1536",
    "generate_local_rag_synthesis",
    "get_active_llm_config",
    "probe_local_llm_status",
    "project_vector_to_1536",
    "set_active_llm_config",
    "validate_sovereign_local_policy",
]
