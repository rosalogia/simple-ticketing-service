"""add discord_refresh_token and discord_token_expires_at to sessions

Revision ID: 3b4bc7543f8a
Revises: a1b2c3d4e5f6
Create Date: 2026-03-01 13:18:48.320219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b4bc7543f8a'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('discord_refresh_token', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('discord_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.drop_column('discord_token_expires_at')
        batch_op.drop_column('discord_refresh_token')
