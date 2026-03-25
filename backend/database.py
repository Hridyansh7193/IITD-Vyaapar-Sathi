"""
database.py
===========
SQLAlchemy engine + session factory for SQLite (dev) / PostgreSQL (prod).
Switch DATABASE_URL in .env to migrate — no code changes needed.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.settings import get_settings

settings = get_settings()

# connect_args only needed for SQLite (thread safety)
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Advanced connection pooling for production (PostgreSQL)
pool_config = {}
if not settings.DATABASE_URL.startswith("sqlite"):
    pool_config = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 1800, # Recycle connections every 30 mins
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,  # Logs SQL queries in debug mode
    **pool_config
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models inherit from this base
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session and ensures it is
    closed after the request — even if an exception occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all tables defined in models on startup.
    Safe to call multiple times (only creates if not exists).
    """
    # Import all models here so SQLAlchemy registers them before creating tables
    from models import user, product  # noqa: F401
    Base.metadata.create_all(bind=engine)
