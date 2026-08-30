# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Initial database schema baseline.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-30 14:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create initial baseline tables if they do not already exist."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. users table
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("user_id", sa.String(length=64), nullable=False),
            sa.Column("google_sub", sa.String(length=128), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("picture", sa.String(length=512), nullable=True),
            sa.Column("role", sa.String(length=32), nullable=False),
            sa.Column("tenant_id", sa.String(length=64), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("last_login_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("user_id"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)
        op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)

    # 2. user_sessions table
    if "user_sessions" not in existing_tables:
        op.create_table(
            "user_sessions",
            sa.Column("session_token", sa.String(length=128), nullable=False),
            sa.Column("user_id", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("last_accessed_at", sa.DateTime(), nullable=False),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("user_agent", sa.String(length=256), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.user_id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("session_token"),
        )
        op.create_index(
            "ix_user_sessions_expires_at", "user_sessions", ["expires_at"], unique=False
        )
        op.create_index(
            "ix_user_sessions_user_id", "user_sessions", ["user_id"], unique=False
        )

    # 3. orchestrator_sessions table
    if "orchestrator_sessions" not in existing_tables:
        op.create_table(
            "orchestrator_sessions",
            sa.Column("session_id", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.String(length=64), nullable=True),
            sa.Column("tenant_id", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("current_stage", sa.String(length=32), nullable=False),
            sa.Column("brand_name", sa.String(length=128), nullable=False),
            sa.Column("product_name", sa.String(length=128), nullable=False),
            sa.Column("campaign_objective", sa.Text(), nullable=False),
            sa.Column("budget_amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(length=16), nullable=False),
            sa.Column("channels", sa.JSON(), nullable=False),
            sa.Column("deliverables", sa.JSON(), nullable=False),
            sa.Column("revision_count", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.user_id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("session_id"),
        )
        op.create_index(
            "ix_orchestrator_sessions_user_id",
            "orchestrator_sessions",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    """Drop all tables in reverse dependency order if they exist."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "orchestrator_sessions" in existing_tables:
        op.drop_index(
            "ix_orchestrator_sessions_user_id", table_name="orchestrator_sessions"
        )
        op.drop_table("orchestrator_sessions")

    if "user_sessions" in existing_tables:
        op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
        op.drop_index("ix_user_sessions_expires_at", table_name="user_sessions")
        op.drop_table("user_sessions")

    if "users" in existing_tables:
        op.drop_index("ix_users_google_sub", table_name="users")
        op.drop_index("ix_users_email", table_name="users")
        op.drop_table("users")
