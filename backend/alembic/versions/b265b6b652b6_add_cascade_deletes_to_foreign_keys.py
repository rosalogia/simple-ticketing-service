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


def _is_postgres():
    return op.get_bind().dialect.name == "postgresql"


def _replace_fk(table, column, ref_table, constraint_name):
    """Drop and recreate a FK with CASCADE, handling both PG and SQLite."""
    if _is_postgres():
        # PostgreSQL: use standard ALTER TABLE with the auto-generated name
        # PG auto-names unnamed FKs as {table}_{column}_fkey
        pg_name = f"{table}_{column}_fkey"
        op.drop_constraint(pg_name, table, type_="foreignkey")
        op.create_foreign_key(constraint_name, table, ref_table, [column], ["id"], ondelete="CASCADE")
    else:
        # SQLite: use batch mode with naming convention to find unnamed FKs
        with op.batch_alter_table(table, naming_convention=_naming) as batch_op:
            batch_op.drop_constraint(constraint_name, type_="foreignkey")
            batch_op.create_foreign_key(constraint_name, ref_table, [column], ["id"], ondelete="CASCADE")


def _replace_fk_no_cascade(table, column, ref_table, constraint_name):
    """Drop and recreate a FK without CASCADE (for downgrade)."""
    if _is_postgres():
        op.drop_constraint(constraint_name, table, type_="foreignkey")
        op.create_foreign_key(f"{table}_{column}_fkey", table, ref_table, [column], ["id"])
    else:
        with op.batch_alter_table(table, naming_convention=_naming) as batch_op:
            batch_op.drop_constraint(constraint_name, type_="foreignkey")
            batch_op.create_foreign_key(constraint_name, ref_table, [column], ["id"])


def upgrade() -> None:
    """Upgrade schema — recreate tables with CASCADE on delete FKs."""
    _replace_fk('comments', 'ticket_id', 'tickets', 'fk_comments_ticket_id_tickets')
    _replace_fk('comments', 'user_id', 'users', 'fk_comments_user_id_users')
    _replace_fk('queue_members', 'queue_id', 'queues', 'fk_queue_members_queue_id_queues')
    _replace_fk('queue_members', 'user_id', 'users', 'fk_queue_members_user_id_users')
    _replace_fk('sessions', 'user_id', 'users', 'fk_sessions_user_id_users')
    _replace_fk('tickets', 'queue_id', 'queues', 'fk_tickets_queue_id_queues')


def downgrade() -> None:
    """Downgrade schema — remove CASCADE from FKs."""
    _replace_fk_no_cascade('tickets', 'queue_id', 'queues', 'fk_tickets_queue_id_queues')
    _replace_fk_no_cascade('sessions', 'user_id', 'users', 'fk_sessions_user_id_users')
    _replace_fk_no_cascade('queue_members', 'queue_id', 'queues', 'fk_queue_members_queue_id_queues')
    _replace_fk_no_cascade('queue_members', 'user_id', 'users', 'fk_queue_members_user_id_users')
    _replace_fk_no_cascade('comments', 'ticket_id', 'tickets', 'fk_comments_ticket_id_tickets')
    _replace_fk_no_cascade('comments', 'user_id', 'users', 'fk_comments_user_id_users')
