"""Sovereign Local-First LLM Policy, Provider Registry, Schemas & Vector Projection (`apps/api/llm_policy.py`).

Enforces `VECTRA_BLOCK_COMMERCIAL_LLMS=true` by blocking commercial cloud LLM hosts and model families,
ensuring `[Subscriber Licensed]` citations and `user_private` consultant notes never leave local infrastructure.
"""
from __future__ import annotations

import math
import os
from typing import Any, Dict, List, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field
from vectra_db import EMBEDDING_DIM

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
    "gpt-",
    "o1-",
    "o3-",
    "o4-",
    "openai/",
    "text-embedding-3-",
    "text-embedding-ada-",
    "claude-",
    "anthropic/",
    "gemini-",
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
    timeout_seconds: float = Field(default=60.0, ge=0.5, le=120.0)
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
        timeout_seconds=float(os.getenv("VECTRA_LLM_TIMEOUT_SECONDS", "60.0")),
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
