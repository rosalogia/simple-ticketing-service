from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def collect_pool_metrics() -> None:
    """Snapshot the SQLAlchemy pool stats into Prometheus gauges."""
    from .metrics import DB_POOL_CHECKED_OUT, DB_POOL_OVERFLOW, DB_POOL_SIZE

    pool = engine.pool
    if hasattr(pool, "size"):
        DB_POOL_SIZE.set(pool.size())
        DB_POOL_CHECKED_OUT.set(pool.checkedout())
        DB_POOL_OVERFLOW.set(pool.overflow())
