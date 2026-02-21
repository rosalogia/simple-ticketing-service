"""Tests for notification routing logic (mocked FCM)."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest

from app.models import (
    DeviceToken,
    Ticket,
    TicketPriority,
    TicketStatus,
    UserQueueSettings,
)
from app.notifications import (
    notify_ticket_assigned,
    notify_ticket_reassigned,
    trigger_page_for_ticket,
)


class TestNotifyTicketAssigned:
    def test_self_assignment_skips_notification(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Self assigned",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,  # Same user
            priority=TicketPriority.SEV3,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        with patch("app.notifications.send_notification") as mock_send:
            notify_ticket_assigned(db_session, ticket)
            mock_send.assert_not_called()


class TestNotifyTicketReassigned:
    def test_reassignment_notifies_both(self, db_session, test_user, other_user, test_queue):
        # Add other_user to queue
        from app.models import QueueMember, QueueRole

        db_session.add(
            QueueMember(queue_id=test_queue.id, user_id=other_user.id, role=QueueRole.MEMBER)
        )
        db_session.flush()

        # Give both users device tokens
        db_session.add(DeviceToken(user_id=test_user.id, token="token1", platform="android"))
        db_session.add(DeviceToken(user_id=other_user.id, token="token2", platform="android"))
        db_session.flush()

        ticket = Ticket(
            title="Reassigned",
            queue_id=test_queue.id,
            assignee_id=other_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV3,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        with patch("app.notifications.send_notification") as mock_send:
            notify_ticket_reassigned(db_session, ticket, test_user.id, other_user.id)
            # Should notify old assignee (test_user) and new assignee (other_user)
            assert mock_send.call_count == 2


class TestTriggerPageForTicket:
    def test_sev2_outside_hours_skipped(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV2 off hours",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV2,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        with (
            patch("app.notifications._is_within_pageable_hours", return_value=False),
            patch("app.notifications.send_page") as mock_page,
        ):
            trigger_page_for_ticket(db_session, ticket)
            mock_page.assert_not_called()

    def test_sev1_respects_opt_out(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV1 opt-out",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        # User has opted out of off-hours SEV1 pages
        settings = UserQueueSettings(
            user_id=test_user.id,
            queue_id=test_queue.id,
            sev1_off_hours_opt_out=True,
        )
        db_session.add(settings)
        db_session.flush()

        with (
            patch("app.notifications._is_within_pageable_hours", return_value=False),
            patch("app.notifications.send_page") as mock_page,
        ):
            trigger_page_for_ticket(db_session, ticket)
            mock_page.assert_not_called()

    def test_sev1_pages_within_hours(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV1 within hours",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        db_session.add(DeviceToken(user_id=test_user.id, token="dev_token", platform="android"))
        db_session.flush()

        with (
            patch("app.notifications._is_within_pageable_hours", return_value=True),
            patch("app.notifications.send_page") as mock_page,
        ):
            trigger_page_for_ticket(db_session, ticket)
            mock_page.assert_called_once()

    def test_non_pageable_priority_skipped(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV3 no page",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV3,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        with patch("app.notifications.send_page") as mock_page:
            trigger_page_for_ticket(db_session, ticket)
            mock_page.assert_not_called()
