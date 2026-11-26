"""Phase 2: Database layer (SQLite + SQLAlchemy 2.x).

Teen tables:
  ingestion_audit_log -> har ETL run ka record (kab, kitni rows, kaunsi file)
  nas_data_revisions  -> har run ka "batch" (versioning)
  nas_data            -> asli data, har row ke saath uska source run

Tables banane ke liye (backend folder se):
  uv run python -m db.database
"""
import datetime as dt
from pathlib import Path

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

# DB file backend/nas_data.db me banegi
DB_PATH = Path(__file__).resolve().parent.parent / "nas_data.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite + FastAPI (multiple threads) ke liye check_same_thread=False zaroori hai
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Base(DeclarativeBase):
    pass


class IngestionAuditLog(Base):
    __tablename__ = "ingestion_audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    timestamp: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    rows_processed: Mapped[int] = mapped_column(Integer)
    source_file_hash: Mapped[str | None] = mapped_column(String(64))  # SHA-256
    success: Mapped[bool] = mapped_column(Boolean)
    error_message: Mapped[str | None] = mapped_column(String)


class NasDataRevision(Base):
    __tablename__ = "nas_data_revisions"

    revision_id: Mapped[int] = mapped_column(primary_key=True)
    revision_name: Mapped[str] = mapped_column(String(100))
    release_date: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class NasData(Base):
    __tablename__ = "nas_data"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Provenance: ye row kis run / batch se aayi
    revision_id: Mapped[int | None] = mapped_column(ForeignKey("nas_data_revisions.revision_id"))
    source_run_id: Mapped[int | None] = mapped_column(ForeignKey("ingestion_audit_log.id"))

    # CSV ke columns
    base_year: Mapped[str | None] = mapped_column(String(20))
    series: Mapped[str | None] = mapped_column(String(50))
    year: Mapped[str | None] = mapped_column(String(20))          # "2022-23"
    year_int: Mapped[int | None] = mapped_column(Integer, index=True)  # 2022 (sorting ke liye)
    indicator: Mapped[str | None] = mapped_column(String(100), index=True)
    frequency: Mapped[str | None] = mapped_column(String(20))     # Annual / Quarterly
    estimate_stage: Mapped[str | None] = mapped_column(String(50))  # CSV ka `revision` (First Advance, Final...)
    industry: Mapped[str | None] = mapped_column(String(200), index=True)
    subindustry: Mapped[str | None] = mapped_column(String(200))
    institutional_sector: Mapped[str | None] = mapped_column(String(200))
    quarter: Mapped[str | None] = mapped_column(String(10))
    current_price: Mapped[float | None] = mapped_column(Numeric)
    constant_price: Mapped[float | None] = mapped_column(Numeric)
    unit: Mapped[str | None] = mapped_column(String(50))

    # Anomaly detection (Phase 3 me bharenge)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rejected: Mapped[bool] = mapped_column(Boolean, default=False)  # reject = soft delete (row rehti hai)
    anomaly_score: Mapped[float | None] = mapped_column(Numeric)


def init_db() -> None:
    """Saari tables bana do (agar pehle se hain to chhod do)."""
    Base.metadata.create_all(engine)


def get_db():
    """FastAPI dependency: har request ko ek session, kaam ke baad band."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    print(f"Tables ready: {DB_PATH}")
