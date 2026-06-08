"""Add tags and todo_tags tables with indexes

Revision ID: 002_tags
Revises: 001_initial
Create Date: 2025-01-01 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_tags"
down_revision: Union[str, None] = "a0790c76a129"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tags table
    op.create_table(
        "tags",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Case-insensitive unique tag name per user
    # Using a functional unique index on LOWER(name) per user_id
    op.create_index("ix_tags_user_id", "tags", ["user_id"])
    op.create_index(
        "uq_tags_user_lower_name",
        "tags",
        [sa.text("user_id"), sa.text("LOWER(name)")],
        unique=True,
    )

    # Create todo_tags junction table
    op.create_table(
        "todo_tags",
        sa.Column("todo_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["todo_id"], ["todos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("todo_id", "tag_id"),
    )

    # Indexes on todo_tags
    op.create_index("ix_todo_tags_tag_id", "todo_tags", ["tag_id"])
    op.create_index("ix_todo_tags_todo_id", "todo_tags", ["todo_id"])

    # Composite index on todos for filtering performance
    op.create_index(
        "ix_todos_user_completed_created",
        "todos",
        ["user_id", "completed", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_todos_user_completed_created", table_name="todos")
    op.drop_index("ix_todo_tags_todo_id", table_name="todo_tags")
    op.drop_index("ix_todo_tags_tag_id", table_name="todo_tags")
    op.drop_table("todo_tags")
    op.drop_index("uq_tags_user_lower_name", table_name="tags")
    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_table("tags")
