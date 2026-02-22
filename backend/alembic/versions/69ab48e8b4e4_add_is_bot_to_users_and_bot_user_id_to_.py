"""add is_bot to users and bot_user_id to api_keys

Revision ID: 69ab48e8b4e4
Revises: 82e2293d1786
Create Date: 2026-02-21 20:45:04.655803

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '69ab48e8b4e4'
down_revision: Union[str, Sequence[str], None] = '82e2293d1786'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and backfill bot users for existing API keys."""
    with op.batch_alter_table('api_keys', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bot_user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'users', ['bot_user_id'], ['id'])

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_bot', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # Data migration: create bot users for existing API keys
    conn = op.get_bind()
    api_keys = conn.execute(
        sa.text("SELECT id, name FROM api_keys WHERE bot_user_id IS NULL")
    ).fetchall()
    for ak_id, ak_name in api_keys:
        conn.execute(
            sa.text(
                "INSERT INTO users (username, display_name, is_bot) "
                "VALUES (:username, :display_name, :is_bot)"
            ),
            {"username": f"bot-{ak_id}", "display_name": ak_name, "is_bot": True},
        )
        bot_user_id = conn.execute(
            sa.text("SELECT id FROM users WHERE username = :username"),
            {"username": f"bot-{ak_id}"},
        ).scalar()
        conn.execute(
            sa.text("UPDATE api_keys SET bot_user_id = :bot_id WHERE id = :ak_id"),
            {"bot_id": bot_user_id, "ak_id": ak_id},
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_bot')

    with op.batch_alter_table('api_keys', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('bot_user_id')
