from __future__ import annotations

import re
from datetime import date

from ..models import TicketPriority

_SEV_RE = re.compile(r"[Ss](?:ev)?[-\s]?([1-4])|^([1-4])$")

_PRIORITY_MAP = {
    "1": TicketPriority.SEV1,
    "2": TicketPriority.SEV2,
    "3": TicketPriority.SEV3,
    "4": TicketPriority.SEV4,
}


def parse_severity(raw: str) -> TicketPriority | None:
    """Parse a severity string like 'Sev2', 'Sev-2', '2', 's2' into a TicketPriority."""
    m = _SEV_RE.search(raw.strip())
    if not m:
        return None
    digit = m.group(1) or m.group(2)
    return _PRIORITY_MAP.get(digit)


def parse_due_date(raw: str) -> date | None:
    """Parse a date string in MM/DD/YYYY format."""
    from datetime import datetime as dt

    try:
        return dt.strptime(raw.strip(), "%m/%d/%Y").date()
    except ValueError:
        return None


def parse_cti(raw: str) -> tuple[str, str, str] | None:
    """Parse a CTI string like 'Category/Type/Item' into a 3-tuple."""
    parts = raw.strip().split("/")
    if len(parts) != 3:
        return None
    parts = [p.strip() for p in parts]
    if not all(parts):
        return None
    return (parts[0], parts[1], parts[2])


def ticket_url(frontend_url: str, queue_id: int, ticket_id: int) -> str:
    """Build a frontend URL for a ticket."""
    base = frontend_url.rstrip("/")
    return f"{base}/queues/{queue_id}/tickets/{ticket_id}"
