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


# Naming convention so batch mode can find unnamed SQLite FK constraints
_naming = {
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
}


def upgrade() -> None:
    """Upgrade schema — recreate tables with CASCADE on delete FKs."""
    # comments: ticket_id → CASCADE, user_id → CASCADE
    with op.batch_alter_table('comments', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_comments_ticket_id_tickets', type_='foreignkey')
        batch_op.drop_constraint('fk_comments_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_comments_ticket_id_tickets', 'tickets', ['ticket_id'], ['id'], ondelete='CASCADE')
        batch_op.create_foreign_key('fk_comments_user_id_users', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # queue_members: queue_id → CASCADE, user_id → CASCADE
    with op.batch_alter_table('queue_members', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_queue_members_queue_id_queues', type_='foreignkey')
        batch_op.drop_constraint('fk_queue_members_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_queue_members_queue_id_queues', 'queues', ['queue_id'], ['id'], ondelete='CASCADE')
        batch_op.create_foreign_key('fk_queue_members_user_id_users', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # sessions: user_id → CASCADE
    with op.batch_alter_table('sessions', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_sessions_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_sessions_user_id_users', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # tickets: queue_id → CASCADE
    with op.batch_alter_table('tickets', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_tickets_queue_id_queues', type_='foreignkey')
        batch_op.create_foreign_key('fk_tickets_queue_id_queues', 'queues', ['queue_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema — remove CASCADE from FKs."""
    with op.batch_alter_table('tickets', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_tickets_queue_id_queues', type_='foreignkey')
        batch_op.create_foreign_key('fk_tickets_queue_id_queues', 'queues', ['queue_id'], ['id'])

    with op.batch_alter_table('sessions', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_sessions_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_sessions_user_id_users', 'users', ['user_id'], ['id'])

    with op.batch_alter_table('queue_members', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_queue_members_queue_id_queues', type_='foreignkey')
        batch_op.drop_constraint('fk_queue_members_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_queue_members_queue_id_queues', 'queues', ['queue_id'], ['id'])
        batch_op.create_foreign_key('fk_queue_members_user_id_users', 'users', ['user_id'], ['id'])

    with op.batch_alter_table('comments', naming_convention=_naming) as batch_op:
        batch_op.drop_constraint('fk_comments_ticket_id_tickets', type_='foreignkey')
        batch_op.drop_constraint('fk_comments_user_id_users', type_='foreignkey')
        batch_op.create_foreign_key('fk_comments_ticket_id_tickets', 'tickets', ['ticket_id'], ['id'])
        batch_op.create_foreign_key('fk_comments_user_id_users', 'users', ['user_id'], ['id'])
