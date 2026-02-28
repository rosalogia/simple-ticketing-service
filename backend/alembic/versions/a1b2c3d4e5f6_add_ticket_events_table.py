"""Add ticket_events table

Revision ID: a1b2c3d4e5f6
Revises: f4a8c2d7e9b1
Create Date: 2026-02-27 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f4a8c2d7e9b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ticket_events",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "event_type",
            sa.String(30),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("old_value", sa.String(500), nullable=True),
        sa.Column("new_value", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_ticket_events_ticket_type",
        "ticket_events",
        ["ticket_id", "event_type"],
    )

    # Backfill: create CREATED events for all existing tickets
    op.execute(
        """
        INSERT INTO ticket_events (ticket_id, event_type, actor_id, old_value, new_value, created_at)
        SELECT id, 'CREATED', assigner_id, NULL, status, created_at
        FROM tickets
        """
    )

    # Backfill: create STATUS_CHANGED events for tickets no longer OPEN
    op.execute(
        """
        INSERT INTO ticket_events (ticket_id, event_type, actor_id, old_value, new_value, created_at)
        SELECT id, 'STATUS_CHANGED', COALESCE(assignee_id, assigner_id), 'OPEN', status, updated_at
        FROM tickets
        WHERE status != 'OPEN'
        """
    )


def downgrade() -> None:
    op.drop_index("ix_ticket_events_ticket_type", table_name="ticket_events")
    op.drop_table("ticket_events")
