"""Initial VECTRA schema with pgvector, Apache AGE, and Row-Level Security

Revision ID: 0001_initial_vectra_schema
Revises: None
Create Date: 2026-11-14
"""
from pathlib import Path
from alembic import op

revision = "0001_initial_vectra_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[2] / "sql" / "init_extensions_and_rls.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS consultant_notes CASCADE;")
    op.execute("DROP TABLE IF EXISTS associative_edges CASCADE;")
    op.execute("DROP TABLE IF EXISTS node_sources CASCADE;")
    op.execute("DROP TABLE IF EXISTS canonical_nodes CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_integrations CASCADE;")
