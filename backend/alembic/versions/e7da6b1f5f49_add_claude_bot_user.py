"""add_claude_bot_user

Revision ID: e7da6b1f5f49
Revises: 93dd70933afc
Create Date: 2026-02-21 01:01:49.015609

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7da6b1f5f49'
down_revision: Union[str, Sequence[str], None] = '93dd70933afc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed a Claude bot user for MCP ticket attribution."""
    op.execute(
        sa.text(
            "INSERT INTO users (username, display_name, discord_id, avatar_url) "
            "VALUES ('claude-bot', 'Claude', NULL, NULL)"
        )
    )


def downgrade() -> None:
    """Remove the Claude bot user."""
    op.execute(sa.text("DELETE FROM users WHERE username = 'claude-bot'"))
