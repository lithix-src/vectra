"""Pydantic v2 Request & Structured Output Schemas for VECTRA API (`apps/api/schemas.py`)."""
from __future__ import annotations

from typing import List, Literal
from pydantic import BaseModel, Field

INDUSTRY_VERTICALS = [
    "All Verticals",
    "Financial Services",
    "Healthcare & Life Sciences",
    "Manufacturing & Supply Chain",
    "Retail/CPG",
    "Legal/Professional Services",
    "Cross-Industry Horizontal",
]

RelationLiteral = Literal["ENABLES", "CONFLICTS_WITH", "REGULATES", "CASE_STUDY_OF", "REPLACES"]
VariantLensLiteral = Literal["c_suite", "cto", "contrarian"]


class WeightUpdateRequest(BaseModel):
    consultant_weight: float = Field(..., ge=0.5, le=5.0)


class NoteUpdateRequest(BaseModel):
    markdown_content: str
    default_relation_type: RelationLiteral = "ENABLES"


class CreateEdgeRequest(BaseModel):
    source_node_id: str
    target_node_id: str
    relation_type: RelationLiteral = "ENABLES"
    weight: float = Field(default=2.0, ge=0.5, le=5.0)
    consultant_note: str = ""


class InboundEmailWebhookRequest(BaseModel):
    recipient: str = "intel+erik@ingest.vectra.ai"
    sender_publication: str = "Stratechery (Ben Thompson)"
    author_handle: str = "@benthompson"
    subject: str
    direct_url: str = "https://stratechery.com/2026/enterprise-agentic-kyc-and-vllm/"
    extracted_quote: str
    industry_verticals: List[str] = Field(
        default_factory=lambda: ["Financial Services", "Cross-Industry Horizontal"]
    )


class CopilotCitationRef(BaseModel):
    source_id: str
    node_title: str
    source_name: str
    direct_url: str
    provenance_license: Literal["public", "subscriber_licensed"]
    exact_quote: str


class CopilotStructuredResponse(BaseModel):
    executive_answer: str
    architectural_implications: List[str]
    contrarian_risks: List[str]
    recommended_90_day_actions: List[str]
    citations_used: List[CopilotCitationRef]
    subgraph_node_count: int
    subgraph_edge_count: int
    llm_provider: str = "ollama"
    llm_model: str = "qwen2.5:14b-instruct"
    execution_mode: Literal["local_llm", "deterministic_local_fallback"] = "deterministic_local_fallback"
    commercial_models_blocked: bool = True
    mcp_mediated: bool = True
    mcp_tools_invoked: List[str] = Field(default_factory=list)
    mcp_audit_ids: List[str] = Field(default_factory=list)
    latency_ms: float = 0.0


class LocalEmbedRequest(BaseModel):
    text: str


class CopilotQueryRequest(BaseModel):
    node_ids: List[str]
    question: str
    variant_lens: VariantLensLiteral = "c_suite"
    industry_vertical: str = "All Verticals"


class CreatePresentationSessionRequest(BaseModel):
    title: str = "VECTRA Boardroom Executive Readout"
    node_ids: List[str] = Field(default_factory=list)
    variant_lens: VariantLensLiteral = "c_suite"
    industry_vertical: str = "All Verticals"
    copilot_synthesis: str | None = None


class ExportPptxRequest(BaseModel):
    deck_title: str = "VECTRA Boardroom Advisory Readout"
    node_ids: List[str] = Field(default_factory=list)
    variant_lens: VariantLensLiteral = "c_suite"
    industry_vertical: str = "All Verticals"
    copilot_synthesis: str | None = None


class CustomSignalIngestRequest(BaseModel):
    title: str
    exact_quote: str
    direct_url: str = "https://sec.gov/edgar"
    source_type: str = "eng_blog"
    source_name: str = "VECTRA Field Dispatch"
    author_handle: str = "@erik_vectra_ai"
    authority_tier: int = Field(default=1, ge=1, le=3)
    provenance_license: Literal["public", "subscriber_licensed"] = "subscriber_licensed"
    visibility: Literal["global", "org_private", "user_private"] = "user_private"
    industry_verticals: List[str] = Field(
        default_factory=lambda: ["Financial Services", "Cross-Industry Horizontal"]
    )


class CollectorScheduleUpdateRequest(BaseModel):
    pack_id: str
    interval_minutes: int = Field(default=60, ge=5, le=1440)
    enabled: bool = True
    run_immediately: bool = False
    allow_live_http: bool = False
