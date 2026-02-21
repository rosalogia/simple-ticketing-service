"""Tests for model enums, constants, and cascade behavior."""

from app.models import (
    DEFAULT_SCHEDULE,
    SEVERITY_NUM,
    Comment,
    Queue,
    QueueMember,
    QueueRole,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
)


class TestEnums:
    def test_ticket_priority_values(self):
        assert TicketPriority.SEV1.value == "SEV1"
        assert TicketPriority.SEV2.value == "SEV2"
        assert TicketPriority.SEV3.value == "SEV3"
        assert TicketPriority.SEV4.value == "SEV4"

    def test_ticket_status_values(self):
        assert TicketStatus.OPEN.value == "OPEN"
        assert TicketStatus.IN_PROGRESS.value == "IN_PROGRESS"
        assert TicketStatus.BLOCKED.value == "BLOCKED"
        assert TicketStatus.COMPLETED.value == "COMPLETED"
        assert TicketStatus.CANCELLED.value == "CANCELLED"

    def test_queue_role_values(self):
        assert QueueRole.OWNER.value == "OWNER"
        assert QueueRole.MEMBER.value == "MEMBER"
        assert QueueRole.VIEWER.value == "VIEWER"


class TestSeverityNum:
    def test_mapping(self):
        assert SEVERITY_NUM[TicketPriority.SEV1] == 1
        assert SEVERITY_NUM[TicketPriority.SEV2] == 2
        assert SEVERITY_NUM[TicketPriority.SEV3] == 3
        assert SEVERITY_NUM[TicketPriority.SEV4] == 4

    def test_sev1_most_severe(self):
        assert SEVERITY_NUM[TicketPriority.SEV1] < SEVERITY_NUM[TicketPriority.SEV4]


class TestDefaultSchedule:
    def test_all_days_present(self):
        expected_days = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
        assert set(DEFAULT_SCHEDULE.keys()) == expected_days

    def test_default_hours(self):
        for day, config in DEFAULT_SCHEDULE.items():
            assert config["start"] == "09:00"
            assert config["end"] == "17:00"


class TestCascadeDelete:
    def test_queue_delete_cascades_to_tickets(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Cascade test",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()
        ticket_id = ticket.id

        db_session.delete(test_queue)
        db_session.flush()

        assert db_session.get(Ticket, ticket_id) is None

    def test_queue_delete_cascades_to_members(self, db_session, test_user, test_queue):
        member_count = (
            db_session.query(QueueMember)
            .filter(QueueMember.queue_id == test_queue.id)
            .count()
        )
        assert member_count > 0

        queue_id = test_queue.id
        db_session.delete(test_queue)
        db_session.flush()

        remaining = (
            db_session.query(QueueMember)
            .filter(QueueMember.queue_id == queue_id)
            .count()
        )
        assert remaining == 0

    def test_ticket_delete_cascades_to_comments(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Comment cascade",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        comment = Comment(
            ticket_id=ticket.id,
            user_id=test_user.id,
            content="Will be deleted",
        )
        db_session.add(comment)
        db_session.flush()
        comment_id = comment.id

        db_session.delete(ticket)
        db_session.flush()

        assert db_session.get(Comment, comment_id) is None
