from sqlalchemy import distinct
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user_id
from ..database import get_db
from ..models import QueueMember, Ticket
from ..schemas import CategoriesResponse

router = APIRouter()


@router.get("/", response_model=CategoriesResponse)
def get_categories(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    # Verify membership
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == current_user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")

    base = db.query(Ticket).filter(Ticket.queue_id == queue_id).subquery()

    categories = (
        db.query(distinct(base.c.category))
        .filter(base.c.category.isnot(None))
        .all()
    )
    types = (
        db.query(distinct(base.c.type))
        .filter(base.c.type.isnot(None))
        .all()
    )
    items = (
        db.query(distinct(base.c.item))
        .filter(base.c.item.isnot(None))
        .all()
    )
    return CategoriesResponse(
        categories=sorted(c[0] for c in categories),
        types=sorted(t[0] for t in types),
        items=sorted(i[0] for i in items),
    )
