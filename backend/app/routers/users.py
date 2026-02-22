from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id, get_optional_user_id
from ..config import DEBUG
from ..database import get_db
from ..models import QueueMember, User
from ..schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user_id: int | None = Depends(get_optional_user_id),
):
    # In dev mode, return all users so the user switcher works
    if DEBUG:
        return db.query(User).filter(User.is_bot == False).order_by(User.display_name).all()

    if current_user_id is None:
        return []

    # Return only users who share at least one queue with the caller
    my_queue_ids = (
        db.query(QueueMember.queue_id)
        .filter(QueueMember.user_id == current_user_id)
        .subquery()
    )
    shared_users = (
        db.query(User)
        .join(QueueMember, QueueMember.user_id == User.id)
        .filter(
            QueueMember.queue_id.in_(db.query(my_queue_ids.c.queue_id)),
            User.is_bot == False,
        )
        .distinct()
        .order_by(User.display_name)
        .all()
    )
    return shared_users


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _current_user_id: int = Depends(get_current_user_id),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(409, "Username already exists")
    user = User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user_id: int = Depends(get_current_user_id),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user
