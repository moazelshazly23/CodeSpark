"""Initial complete CodeSpark PostgreSQL schema migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Read and execute complete PostgreSQL schema definition
    import os
    schema_path = os.path.join(os.path.dirname(__file__), "..", "..", "app", "db", "schema_postgres.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            sql = f.read()
        op.execute(sql)

def downgrade() -> None:
    pass
