"""add cascade deletes to foreign keys

Revision ID: b265b6b652b6
Revises: 72aa7490e369
Create Date: 2026-02-11 23:48:15.454502

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b265b6b652b6'
down_revision: Union[str, Sequence[str], None] = '72aa7490e369'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # comments
    op.drop_constraint('comments_ticket_id_fkey', 'comments', type_='foreignkey')
    op.drop_constraint('comments_user_id_fkey', 'comments', type_='foreignkey')
    op.create_foreign_key('comments_ticket_id_fkey', 'comments', 'tickets', ['ticket_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('comments_user_id_fkey', 'comments', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # queue_members
    op.drop_constraint('queue_members_queue_id_fkey', 'queue_members', type_='foreignkey')
    op.drop_constraint('queue_members_user_id_fkey', 'queue_members', type_='foreignkey')
    op.create_foreign_key('queue_members_queue_id_fkey', 'queue_members', 'queues', ['queue_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('queue_members_user_id_fkey', 'queue_members', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # sessions
    op.drop_constraint('sessions_user_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key('sessions_user_id_fkey', 'sessions', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # tickets
    op.drop_constraint('tickets_queue_id_fkey', 'tickets', type_='foreignkey')
    op.create_foreign_key('tickets_queue_id_fkey', 'tickets', 'queues', ['queue_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('tickets_queue_id_fkey', 'tickets', type_='foreignkey')
    op.create_foreign_key('tickets_queue_id_fkey', 'tickets', 'queues', ['queue_id'], ['id'])

    op.drop_constraint('sessions_user_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key('sessions_user_id_fkey', 'sessions', 'users', ['user_id'], ['id'])

    op.drop_constraint('queue_members_queue_id_fkey', 'queue_members', type_='foreignkey')
    op.drop_constraint('queue_members_user_id_fkey', 'queue_members', type_='foreignkey')
    op.create_foreign_key('queue_members_queue_id_fkey', 'queue_members', 'queues', ['queue_id'], ['id'])
    op.create_foreign_key('queue_members_user_id_fkey', 'queue_members', 'users', ['user_id'], ['id'])

    op.drop_constraint('comments_ticket_id_fkey', 'comments', type_='foreignkey')
    op.drop_constraint('comments_user_id_fkey', 'comments', type_='foreignkey')
    op.create_foreign_key('comments_ticket_id_fkey', 'comments', 'tickets', ['ticket_id'], ['id'])
    op.create_foreign_key('comments_user_id_fkey', 'comments', 'users', ['user_id'], ['id'])
