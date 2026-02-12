"""Seed the database with sample data. Run: uv run python -m app.seed"""

import subprocess
import sys
from datetime import date

from .database import Base, SessionLocal, engine
from .models import (
    Comment,
    Queue,
    QueueMember,
    QueueRole,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
)


def insert_sample_data():
    """Insert sample data into an existing (empty) database."""
    engine.dispose()
    db = SessionLocal()

    # ── Users ──────────────────────────────────────────────────────────
    users = [
        User(username="alice", display_name="Alice Chen"),
        User(username="bob", display_name="Bob Martinez"),
        User(username="carol", display_name="Carol Kim"),
        User(username="dave", display_name="Dave Okonkwo"),
    ]
    db.add_all(users)
    db.flush()  # get IDs

    alice, bob, carol, dave = users

    # ── Queue ──────────────────────────────────────────────────────────
    queue = Queue(
        name="Housemates",
        description="Shared queue for our household tasks and favors",
        created_by=alice.id,
    )
    db.add(queue)
    db.flush()

    # Queue members: alice=OWNER, bob/carol/dave=MEMBER
    queue_members = [
        QueueMember(queue_id=queue.id, user_id=alice.id, role=QueueRole.OWNER),
        QueueMember(queue_id=queue.id, user_id=bob.id, role=QueueRole.MEMBER),
        QueueMember(queue_id=queue.id, user_id=carol.id, role=QueueRole.MEMBER),
        QueueMember(queue_id=queue.id, user_id=dave.id, role=QueueRole.MEMBER),
    ]
    db.add_all(queue_members)
    db.flush()

    # ── Tickets ────────────────────────────────────────────────────────
    tickets = [
        Ticket(
            title="Read 'Designing Data-Intensive Applications' Ch. 5",
            description="Focus on the replication chapter. Take notes on leader-based replication.",
            priority=TicketPriority.SEV3,
            status=TicketStatus.OPEN,
            queue_id=queue.id,
            assignee_id=bob.id,
            assigner_id=alice.id,
            due_date=date(2026, 2, 15),
            category="Personal Development",
            type="Reading",
            item="Book",
        ),
        Ticket(
            title="Pick up dry cleaning",
            description="The receipt is on the kitchen counter. Store closes at 6pm.",
            priority=TicketPriority.SEV2,
            status=TicketStatus.OPEN,
            queue_id=queue.id,
            assignee_id=alice.id,
            assigner_id=carol.id,
            due_date=date(2026, 2, 10),
            category="Favors & Errands",
            type="Pickup",
            item="Dry Cleaning",
        ),
        Ticket(
            title="Review Carol's slide deck for Thursday",
            description="Marketing presentation, ~20 slides. Check for data accuracy and flow.",
            priority=TicketPriority.SEV2,
            status=TicketStatus.IN_PROGRESS,
            queue_id=queue.id,
            assignee_id=dave.id,
            assigner_id=carol.id,
            due_date=date(2026, 2, 13),
            category="Work",
            type="Review",
            item="Presentation",
        ),
        Ticket(
            title="Fix the leaky kitchen faucet",
            description="It's been dripping since last week. Might need a new washer.",
            priority=TicketPriority.SEV4,
            status=TicketStatus.BLOCKED,
            queue_id=queue.id,
            assignee_id=bob.id,
            assigner_id=dave.id,
            due_date=None,
            category="Home",
            type="Maintenance",
            item="Plumbing",
        ),
        Ticket(
            title="URGENT: Airport pickup tomorrow 6am",
            description="Terminal B, United flight 847. Text when you're curbside.",
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
            queue_id=queue.id,
            assignee_id=carol.id,
            assigner_id=alice.id,
            due_date=date(2026, 2, 9),
            category="Favors & Errands",
            type="Transportation",
            item="Airport",
        ),
        Ticket(
            title="Compile monthly expense report",
            description="Use the shared spreadsheet. Due by end of month.",
            priority=TicketPriority.SEV3,
            status=TicketStatus.COMPLETED,
            queue_id=queue.id,
            assignee_id=alice.id,
            assigner_id=dave.id,
            due_date=date(2026, 1, 31),
            category="Work",
            type="Reporting",
            item="Finance",
        ),
        Ticket(
            title="Plan group dinner for Saturday",
            description="Find a restaurant that works for everyone. Budget ~$40/person.",
            priority=TicketPriority.SEV3,
            status=TicketStatus.IN_PROGRESS,
            queue_id=queue.id,
            assignee_id=carol.id,
            assigner_id=bob.id,
            due_date=date(2026, 2, 14),
            category="Social",
            type="Planning",
            item="Dinner",
        ),
        Ticket(
            title="Set up new dev environment",
            description="Install Python 3.12, Node 20, Docker. Follow the wiki.",
            priority=TicketPriority.SEV3,
            status=TicketStatus.CANCELLED,
            queue_id=queue.id,
            assignee_id=dave.id,
            assigner_id=alice.id,
            due_date=date(2026, 2, 5),
            category="Work",
            type="Setup",
            item="Dev Environment",
        ),
    ]
    db.add_all(tickets)
    db.flush()

    # ── Comments ───────────────────────────────────────────────────────
    comments = [
        Comment(
            ticket_id=tickets[0].id,
            user_id=bob.id,
            content="Started reading, about 30 pages in. Good stuff.",
        ),
        Comment(
            ticket_id=tickets[0].id,
            user_id=alice.id,
            content="Great! Let me know when you finish so we can discuss.",
        ),
        Comment(
            ticket_id=tickets[2].id,
            user_id=dave.id,
            content="Reviewed slides 1-10. Found a couple data issues, will note them.",
        ),
        Comment(
            ticket_id=tickets[3].id,
            user_id=bob.id,
            content="I need to buy a washer first. Home Depot run this weekend.",
        ),
        Comment(
            ticket_id=tickets[4].id,
            user_id=carol.id,
            content="Got it! I'll be there at 5:45am. Send me your flight tracker link.",
        ),
        Comment(
            ticket_id=tickets[6].id,
            user_id=carol.id,
            content="How about that new Italian place on 5th? Checking availability now.",
        ),
    ]
    db.add_all(comments)

    db.commit()
    db.close()

    print(
        f"Seeded: {len(users)} users, 1 queue, {len(queue_members)} members, "
        f"{len(tickets)} tickets, {len(comments)} comments"
    )


def seed():
    """Full reset: drop all tables, re-run migrations, insert sample data."""
    Base.metadata.drop_all(bind=engine)
    # Also drop alembic_version so alembic re-applies from scratch
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    engine.dispose()
    backend_dir = str(__import__("pathlib").Path(__file__).resolve().parent.parent)
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=backend_dir,
    )
    if result.returncode != 0:
        print(f"Alembic upgrade failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    insert_sample_data()


if __name__ == "__main__":
    seed()
