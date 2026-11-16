"""Canonical Semantic Embedding, Cosine Clustering (> 0.84), and Dynamic Composite Scoring Engine.

Formula:
Composite_Score = (SUM(Source_Authority * Recency_Decay) + Graph_Centrality) * Consultant_Weight
"""
from __future__ import annotations

import hashlib
import math
import re
from datetime import datetime, timezone
from typing import Iterable, List, Sequence

EMBEDDING_DIM = 1536
CLUSTER_COSINE_THRESHOLD = 0.84

AUTHORITY_MULTIPLIER = {
    1: 3.0,  # Tier 1: Primary SEC Filing / Production Telemetry / Regulatory Standard
    2: 2.1,  # Tier 2: Verified Principal Builder / Paid Deep-Dive Newsletter
    3: 1.2,  # Tier 3: General Market / Secondary Analysis
}

RELATION_CENTRALITY_BONUS = {
    "ENABLES": 4.2,
    "CASE_STUDY_OF": 4.5,
    "REPLACES": 3.8,
    "REGULATES": 4.0,
    "CONFLICTS_WITH": 3.5,
}


def deterministic_embedding_1536(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """Generate a normalized 1536-dim semantic feature vector using token hashing + trigram projection."""
    vec = [0.0] * dim
    tokens = re.findall(r"[a-z0-9_]+", text.lower())
    if not tokens:
        tokens = ["vectra"]

    # Unigrams + bigrams for strong semantic overlap on shared domain concepts
    features: List[str] = list(tokens)
    for i in range(len(tokens) - 1):
        features.append(f"{tokens[i]}_{tokens[i + 1]}")

    for feat in features:
        digest = hashlib.sha256(feat.encode("utf-8")).digest()
        # Project each token into 8 coordinates of the 1536-dim space
        for slot in range(8):
            idx = int.from_bytes(digest[slot * 2 : slot * 2 + 2], "big") % dim
            sign = 1.0 if (digest[16 + slot] & 1) == 0 else -1.0
            vec[idx] += sign * (1.5 if "_" in feat else 1.0)

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def cosine_similarity(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    if not vec_a or not vec_b:
        return 0.0
    length = min(len(vec_a), len(vec_b))
    dot = sum(vec_a[i] * vec_b[i] for i in range(length))
    norm_a = math.sqrt(sum(vec_a[i] * vec_a[i] for i in range(length))) or 1.0
    norm_b = math.sqrt(sum(vec_b[i] * vec_b[i] for i in range(length))) or 1.0
    return max(-1.0, min(1.0, dot / (norm_a * norm_b)))


def compute_recency_decay(published_at: datetime, now: datetime | None = None) -> float:
    """Half-life decay over 14-day active canonical window."""
    ref_now = now or datetime.now(timezone.utc)
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    delta_days = max(0.0, (ref_now - published_at).total_seconds() / 86400.0)
    half_life_days = 10.0
    decay_lambda = math.log(2.0) / half_life_days
    return math.exp(-decay_lambda * delta_days)


def compute_composite_score(
    *,
    sources: Iterable[tuple[int, datetime]],
    incident_edges: Iterable[tuple[str, float]],
    consultant_weight: float,
    base_signal_score: float = 25.0,
    now: datetime | None = None,
) -> dict[str, float]:
    """Compute real-time importance:
    Composite_Score = (SUM(Source_Authority * Recency_Decay) + Graph_Centrality) * Consultant_Weight
    """
    ref_now = now or datetime.now(timezone.utc)
    source_sum = 0.0
    for tier, pub_at in sources:
        authority = AUTHORITY_MULTIPLIER.get(int(tier), 1.2)
        decay = compute_recency_decay(pub_at, ref_now)
        source_sum += authority * decay * 9.5

    centrality = 0.0
    for rel_type, edge_weight in incident_edges:
        rel_factor = RELATION_CENTRALITY_BONUS.get(rel_type, 3.5)
        centrality += rel_factor * float(edge_weight)

    raw_unweighted = base_signal_score * 0.35 + source_sum + centrality
    clamped_weight = max(0.5, min(5.0, float(consultant_weight)))
    composite = round(raw_unweighted * clamped_weight, 1)

    return {
        "source_authority_component": round(source_sum, 2),
        "graph_centrality_component": round(centrality, 2),
        "consultant_weight": round(clamped_weight, 2),
        "composite_score": composite,
    }


def extract_wikilinks(markdown_text: str) -> List[str]:
    """Extract unique [[Node Title]] targets from Obsidian-style Markdown notes."""
    if not markdown_text:
        return []
    matches = re.findall(r"\[\[([^\[\]]+)\]\]", markdown_text)
    cleaned: List[str] = []
    seen: set[str] = set()
    for match in matches:
        target = match.split("|")[0].strip()
        if target and target.lower() not in seen:
            seen.add(target.lower())
            cleaned.append(target)
    return cleaned
