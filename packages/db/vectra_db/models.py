"""SQLAlchemy 2.0 Async ORM models for VECTRA multi-tenant intelligence database."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class UserIntegration(Base):
    __tablename__ = "user_integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    owner_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    owner_org_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)  # x_oauth2 | inbound_email | substack_session | github
    account_handle: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_dek: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    encryption_iv: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    auth_tag: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    scopes: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="healthy")  # healthy | expiring_soon | expired
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CanonicalNode(Base):
    __tablename__ = "canonical_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary_executive: Mapped[str] = mapped_column(Text, nullable=False)
    summary_technical: Mapped[str] = mapped_column(Text, nullable=False)
    summary_contrarian: Mapped[str] = mapped_column(Text, nullable=False)
    claim_vendor: Mapped[str] = mapped_column(Text, nullable=False)
    claim_builder: Mapped[str] = mapped_column(Text, nullable=False)
    claim_production: Mapped[str] = mapped_column(Text, nullable=False)
    industry_verticals: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    maturity_stage: Mapped[str] = mapped_column(String(32), nullable=False, default="production_scale")
    base_signal_score: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    consultant_weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    adoption_velocity: Mapped[float] = mapped_column(Float, nullable=False, default=70.0)
    verified_roi_score: Mapped[float] = mapped_column(Float, nullable=False, default=75.0)
    visibility: Mapped[str] = mapped_column(String(32), nullable=False, default="global")  # global | org_private | user_private
    owner_org_id: Mapped[str] = mapped_column(String(128), nullable=False, default="global")
    owner_user_id: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    embedding: Mapped[List[float]] = mapped_column(JSON, nullable=False, default=list)  # 1536-d vector stored as float array
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    sources: Mapped[List["NodeSource"]] = relationship(
        "NodeSource", back_populates="node", cascade="all, delete-orphan", lazy="selectin"
    )
    notes: Mapped[List["ConsultantNote"]] = relationship(
        "ConsultantNote", back_populates="node", cascade="all, delete-orphan", lazy="selectin"
    )


class NodeSource(Base):
    __tablename__ = "node_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    node_id: Mapped[str] = mapped_column(String(36), ForeignKey("canonical_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)  # x_thread | newsletter | sec_filing | eng_blog | regulatory | github
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_handle: Mapped[str] = mapped_column(String(255), nullable=False)
    authority_tier: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1 (highest) to 3
    direct_url: Mapped[str] = mapped_column(Text, nullable=False)
    exact_quote: Mapped[str] = mapped_column(Text, nullable=False)
    provenance_license: Mapped[str] = mapped_column(String(32), nullable=False, default="public")  # public | subscriber_licensed
    visibility: Mapped[str] = mapped_column(String(32), nullable=False, default="global")  # global | org_private | user_private
    owner_org_id: Mapped[str] = mapped_column(String(128), nullable=False, default="global")
    owner_user_id: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    node: Mapped["CanonicalNode"] = relationship("CanonicalNode", back_populates="sources")


class AssociativeEdge(Base):
    __tablename__ = "associative_edges"
    __table_args__ = (
        UniqueConstraint("source_node_id", "target_node_id", "relation_type", "owner_user_id", name="uq_edge_rel_owner"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    source_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("canonical_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_node_id: Mapped[str] = mapped_column(String(36), ForeignKey("canonical_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type: Mapped[str] = mapped_column(String(64), nullable=False)  # ENABLES | CONFLICTS_WITH | REGULATES | CASE_STUDY_OF | REPLACES
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_user_created: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consultant_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    visibility: Mapped[str] = mapped_column(String(32), nullable=False, default="global")
    owner_org_id: Mapped[str] = mapped_column(String(128), nullable=False, default="global")
    owner_user_id: Mapped[str] = mapped_column(String(128), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ConsultantNote(Base):
    __tablename__ = "consultant_notes"
    __table_args__ = (
        UniqueConstraint("node_id", "owner_user_id", name="uq_note_node_owner"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    node_id: Mapped[str] = mapped_column(String(36), ForeignKey("canonical_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    owner_org_id: Mapped[str] = mapped_column(String(128), nullable=False)
    visibility: Mapped[str] = mapped_column(String(32), nullable=False, default="user_private")
    markdown_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extracted_wikilinks: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    node: Mapped["CanonicalNode"] = relationship("CanonicalNode", back_populates="notes")
