"""002_subscription_plans

Revision ID: 002_subscription_plans
Revises: 001_initial_schema
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002_subscription_plans'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create subscription_plans table
    op.create_table(
        'subscription_plans',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('duration_months', sa.Integer(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('order_index', sa.Integer(), default=0),
        sa.Column('features_json', sa.Text(), default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_sub_plans_active', 'subscription_plans', ['is_active', 'order_index'])

    # 2. Add columns to subscription_requests
    try:
        op.add_column('subscription_requests', sa.Column('plan_id', sa.String(length=64), sa.ForeignKey('subscription_plans.id', ondelete='SET NULL'), nullable=True))
        op.add_column('subscription_requests', sa.Column('duration_months', sa.Integer(), nullable=True))
        op.add_column('subscription_requests', sa.Column('payment_number', sa.String(length=32), nullable=True))
    except Exception:
        pass

def downgrade():
    op.drop_table('subscription_plans')
