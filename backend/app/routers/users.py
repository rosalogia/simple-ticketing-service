from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id, get_optional_user_id
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _current_user_id: int | None = Depends(get_optional_user_id),
):
    return db.query(User).order_by(User.display_name).all()


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
