"""replace_pageable_hours_with_schedule

Revision ID: c8f1a2d3e4b5
Revises: a3abdaa5eb90
Create Date: 2026-02-15 12:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f1a2d3e4b5'
down_revision: Union[str, Sequence[str], None] = 'a3abdaa5eb90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_SCHEDULE = {
    "mon": {"start": "09:00", "end": "17:00"},
    "tue": {"start": "09:00", "end": "17:00"},
    "wed": {"start": "09:00", "end": "17:00"},
    "thu": {"start": "09:00", "end": "17:00"},
    "fri": {"start": "09:00", "end": "17:00"},
    "sat": {"start": "09:00", "end": "17:00"},
    "sun": {"start": "09:00", "end": "17:00"},
}

DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def upgrade() -> None:
    """Add schedule JSON column, migrate existing data, drop old columns."""
    with op.batch_alter_table('user_queue_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('schedule', sa.JSON(), nullable=True)
        )

    # Migrate existing rows: convert pageable_start/pageable_end to schedule
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, pageable_start, pageable_end FROM user_queue_settings")
    ).fetchall()

    for row in rows:
        row_id, start, end = row
        schedule = {day: {"start": start, "end": end} for day in DAY_KEYS}
        conn.execute(
            sa.text("UPDATE user_queue_settings SET schedule = :schedule WHERE id = :id"),
            {"schedule": json.dumps(schedule), "id": row_id},
        )

    # Set default for any rows that still have NULL schedule
    conn.execute(
        sa.text("UPDATE user_queue_settings SET schedule = :schedule WHERE schedule IS NULL"),
        {"schedule": json.dumps(DEFAULT_SCHEDULE)},
    )

    with op.batch_alter_table('user_queue_settings', schema=None) as batch_op:
        batch_op.drop_column('pageable_start')
        batch_op.drop_column('pageable_end')


def downgrade() -> None:
    """Re-add pageable_start/pageable_end, drop schedule."""
    with op.batch_alter_table('user_queue_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('pageable_start', sa.String(length=5), nullable=False, server_default='09:00')
        )
        batch_op.add_column(
            sa.Column('pageable_end', sa.String(length=5), nullable=False, server_default='17:00')
        )

    # Migrate schedule back: use Monday's hours as the single start/end
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, schedule FROM user_queue_settings")
    ).fetchall()

    for row in rows:
        row_id, schedule = row
        if isinstance(schedule, str):
            schedule = json.loads(schedule)
        if schedule and schedule.get("mon"):
            start = schedule["mon"]["start"]
            end = schedule["mon"]["end"]
        else:
            start, end = "09:00", "17:00"
        conn.execute(
            sa.text("UPDATE user_queue_settings SET pageable_start = :start, pageable_end = :end WHERE id = :id"),
            {"start": start, "end": end, "id": row_id},
        )

    with op.batch_alter_table('user_queue_settings', schema=None) as batch_op:
        batch_op.drop_column('schedule')
