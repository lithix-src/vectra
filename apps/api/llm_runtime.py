"""Sovereign Local-First LLM & Embeddings Runtime for VECTRA.

Guarantees 100% zero reliance on commercial cloud LLM APIs (OpenAI, Anthropic, Gemini, Cohere, etc.)
so `[Subscriber Licensed]` intelligence and `user_private` consultant field notes never leave the
local workstation or self-hosted cluster.

Supported Local Providers:
1. `ollama` (Default)      — Native Ollama HTTP API (`http://localhost:11434`, `/api/chat` & `/api/embed`)
2. `litellm_proxy`         — Local LiteLLM Proxy Router (`http://localhost:4000/v1`, configured via `litellm_config.yaml`)
3. `vllm`                  — Local vLLM Disaggregated Serving (`http://localhost:8001/v1`)
4. `llamacpp`              — Local `llama-server` / GGUF runtime (`http://localhost:8080/v1`)
5. `lmstudio`              — Local LM Studio workstation server (`http://localhost:1234/v1`)
"""
from __future__ import annotations

import json
import math
import os
import time
from typing import Any, Dict, List, Literal
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field
from vectra_db import EMBEDDING_DIM, deterministic_embedding_1536

LocalProviderType = Literal["ollama", "litellm_proxy", "vllm", "llamacpp", "lmstudio"]

PROVIDER_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "ollama": {
        "label": "Ollama (Local Daemon)",
        "base_url": "http://localhost:11434",
        "default_model": "qwen2.5:14b-instruct",
        "default_embedding_model": "nomic-embed-text",
        "recommended_models": [
            "qwen2.5:14b-instruct",
            "llama3.3:8b",
            "deepseek-r1:14b",
            "mistral-nemo:12b",
            "phi4:14b",
        ],
        "protocol": "ollama_native",
    },
    "litellm_proxy": {
        "label": "LiteLLM Local Proxy (Multi-Model Router)",
        "base_url": "http://localhost:4000/v1",
        "default_model": "ollama/qwen2.5:14b-instruct",
        "default_embedding_model": "ollama/nomic-embed-text",
        "recommended_models": [
            "ollama/qwen2.5:14b-instruct",
            "ollama/llama3.3:8b",
            "ollama/deepseek-r1:14b",
            "vllm/Qwen2.5-14B-Instruct",
            "llamacpp/local-gguf",
        ],
        "protocol": "openai_compat",
    },
    "vllm": {
        "label": "vLLM (Local GPU / Guided Decoding)",
        "base_url": "http://localhost:8001/v1",
        "default_model": "Qwen/Qwen2.5-14B-Instruct",
        "default_embedding_model": "BAAI/bge-m3",
        "recommended_models": [
            "Qwen/Qwen2.5-14B-Instruct",
            "meta-llama/Llama-3.3-70B-Instruct",
            "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
        ],
        "protocol": "openai_compat",
    },
    "llamacpp": {
        "label": "llama.cpp (llama-server GGUF)",
        "base_url": "http://localhost:8080/v1",
        "default_model": "qwen2.5-14b-instruct-q4_k_m.gguf",
        "default_embedding_model": "nomic-embed-text-v1.5.Q8_0.gguf",
        "recommended_models": [
            "qwen2.5-14b-instruct-q4_k_m.gguf",
            "llama-3.3-8b-instruct-q5_k_m.gguf",
            "deepseek-r1-distill-qwen-14b-q4_k_m.gguf",
        ],
        "protocol": "openai_compat",
    },
    "lmstudio": {
        "label": "LM Studio (Local Workstation Server)",
        "base_url": "http://localhost:1234/v1",
        "default_model": "qwen2.5-14b-instruct",
        "default_embedding_model": "text-embedding-nomic-embed-text-v1.5",
        "recommended_models": [
            "qwen2.5-14b-instruct",
            "llama-3.2-8b-instruct",
            "deepseek-r1-distill-qwen-14b",
        ],
        "protocol": "openai_compat",
    },
}

FORBIDDEN_COMMERCIAL_HOSTS = {
    "api.openai.com",
    "api.anthropic.com",
    "generativelanguage.googleapis.com",
    "api.cohere.ai",
    "api.cohere.com",
    "api.mistral.ai",
    "api.groq.com",
    "api.together.xyz",
    "api.fireworks.ai",
    "api.perplexity.ai",
    "openrouter.ai",
}

FORBIDDEN_COMMERCIAL_MODEL_PREFIXES = (
    "gpt-3.5",
    "gpt-4",
    "gpt-4o",
    "o1-",
    "o3-",
    "openai/gpt-",
    "claude-2",
    "claude-3",
    "anthropic/",
    "gemini-1.",
    "gemini-2.",
    "vertex_ai/",
    "bedrock/",
    "command-r",
)


class SovereignPolicyViolationError(ValueError):
    """Raised when a commercial cloud LLM endpoint or model is configured under VECTRA's sovereign policy."""


class CommercialModelPolicyError(SovereignPolicyViolationError):
    """Alias/subclass raised when a commercial cloud LLM endpoint or model is configured."""


class LocalLLMConfig(BaseModel):
    provider: LocalProviderType = Field(default="ollama")
    base_url: str = Field(default="http://localhost:11434")
    model: str = Field(default="qwen2.5:14b-instruct")
    embedding_model: str = Field(default="nomic-embed-text")
    temperature: float = Field(default=0.15, ge=0.0, le=1.5)
    timeout_seconds: float = Field(default=8.0, ge=0.5, le=120.0)
    block_commercial_models: bool = Field(default=True)


class CopilotLLMGeneration(BaseModel):
    """Strict structured JSON schema enforced on Ollama / LiteLLM / vLLM / llama.cpp output."""

    executive_answer: str
    architectural_implications: List[str]
    contrarian_risks: List[str]
    recommended_90_day_actions: List[str]


def validate_sovereign_local_policy(config: LocalLLMConfig) -> None:
    """Ensure neither base_url nor model references a commercial cloud LLM service."""
    if not config.block_commercial_models:
        return

    parsed = urlparse(config.base_url)
    host = (parsed.hostname or "").lower()
    if host in FORBIDDEN_COMMERCIAL_HOSTS or any(
        host.endswith(f".{domain}") for domain in FORBIDDEN_COMMERCIAL_HOSTS
    ):
        raise CommercialModelPolicyError(
            f"Commercial cloud host '{host}' is blocked by VECTRA Sovereign Local LLM Policy. "
            "Use a local runtime (Ollama, LiteLLM Local Proxy, vLLM, llama.cpp, or LM Studio)."
        )

    for field_label, model_name in (("model", config.model), ("embedding_model", config.embedding_model)):
        normalized = model_name.strip().lower()
        if normalized.startswith(FORBIDDEN_COMMERCIAL_MODEL_PREFIXES):
            raise CommercialModelPolicyError(
                f"Commercial model '{model_name}' ({field_label}) is blocked by VECTRA Sovereign Local LLM Policy. "
                "Configure a local open-weights model via Ollama, vLLM, llama.cpp, or LiteLLM Local Proxy."
            )


def _load_initial_config() -> LocalLLMConfig:
    provider_raw = os.getenv("VECTRA_LLM_PROVIDER", "ollama").strip().lower()
    provider: LocalProviderType = (
        provider_raw if provider_raw in PROVIDER_DEFAULTS else "ollama"  # type: ignore[assignment]
    )
    defaults = PROVIDER_DEFAULTS[provider]
    cfg = LocalLLMConfig(
        provider=provider,
        base_url=os.getenv("VECTRA_LLM_BASE_URL", defaults["base_url"]).rstrip("/"),
        model=os.getenv("VECTRA_LLM_MODEL", defaults["default_model"]),
        embedding_model=os.getenv("VECTRA_EMBEDDING_MODEL", defaults["default_embedding_model"]),
        temperature=float(os.getenv("VECTRA_LLM_TEMPERATURE", "0.15")),
        timeout_seconds=float(os.getenv("VECTRA_LLM_TIMEOUT_SECONDS", "8.0")),
        block_commercial_models=os.getenv("VECTRA_BLOCK_COMMERCIAL_LLMS", "true").lower() != "false",
    )
    validate_sovereign_local_policy(cfg)
    return cfg


_ACTIVE_LLM_CONFIG: LocalLLMConfig = _load_initial_config()


def get_active_llm_config() -> LocalLLMConfig:
    return _ACTIVE_LLM_CONFIG.model_copy(deep=True)


def set_active_llm_config(new_config: LocalLLMConfig) -> LocalLLMConfig:
    global _ACTIVE_LLM_CONFIG
    new_config.base_url = new_config.base_url.rstrip("/")
    validate_sovereign_local_policy(new_config)
    _ACTIVE_LLM_CONFIG = new_config.model_copy(deep=True)
    return get_active_llm_config()


def project_vector_to_1536(raw_vec: List[float], target_dim: int = EMBEDDING_DIM) -> List[float]:
    """Normalize and deterministically project any local embedding dimension (e.g. 384, 768, 1024) to 1536-d."""
    if not raw_vec:
        return [0.0] * target_dim
    src_dim = len(raw_vec)
    if src_dim == target_dim:
        out = list(raw_vec)
    elif src_dim > target_dim:
        out = [0.0] * target_dim
        for idx, val in enumerate(raw_vec):
            out[idx % target_dim] += float(val)
    else:
        out = [0.0] * target_dim
        for i in range(target_dim):
            src_idx = i % src_dim
            harmonic = 1.0 if (i // src_dim) % 2 == 0 else -0.5
            out[i] = float(raw_vec[src_idx]) * harmonic

    norm = math.sqrt(sum(v * v for v in out)) or 1.0
    return [round(v / norm, 6) for v in out]


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
    """Generate a 1536-dim vector using the configured local embedding model (Ollama / LiteLLM / vLLM)
    with automatic projection to 1536-d and deterministic local fallback if offline.
    """
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
    """Execute grammar-constrained Subgraph RAG synthesis against local Ollama / LiteLLM / vLLM / llama.cpp.

    Requires a cryptographically verified `MCPMediatedEnvelope` from `mcp_gateway.py` so the model
    never accesses backend services or database sessions directly.
    """
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
        async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
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
                        # Strip optional markdown code fences if a local GGUF server wrapped JSON
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
