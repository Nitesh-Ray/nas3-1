"""Data endpoints: /api/data/status aur /api/data/all"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.database import IngestionAuditLog, NasData, get_db

router = APIRouter()


def _num(v):
    """Numeric (Decimal) -> float. Missing ko None hi rehne do, 0 nahi."""
    return float(v) if v is not None else None


@router.get("/status")
def data_status(db: Session = Depends(get_db)):
    """Sabse latest ingestion run ka status."""
    latest = db.scalar(
        select(IngestionAuditLog)
        .order_by(IngestionAuditLog.timestamp.desc(), IngestionAuditLog.id.desc())
        .limit(1)
    )
    if latest is None:
        return {"status": "No data ingested yet."}
    return {
        "id": latest.id,
        "timestamp": latest.timestamp.isoformat() if latest.timestamp else None,
        "rows_processed": latest.rows_processed,
        "success": latest.success,
        "source_file_hash": latest.source_file_hash,
    }


@router.get("/all")
def all_data(
    indicator: str | None = None,
    frequency: str | None = None,
    base_year: str | None = None,
    db: Session = Depends(get_db),
):
    """Latest revision ka data + provenance (kis run / file se aaya).
    Optional filters: ?indicator=Gross Domestic Product&frequency=Annual
    """
    latest_rev = select(func.max(NasData.revision_id)).scalar_subquery()

    stmt = (
        select(NasData, IngestionAuditLog)
        .outerjoin(IngestionAuditLog, NasData.source_run_id == IngestionAuditLog.id)
        .where(NasData.revision_id == latest_rev, NasData.is_rejected.is_(False))
    )
    if indicator:
        stmt = stmt.where(NasData.indicator == indicator)
    if frequency:
        stmt = stmt.where(NasData.frequency == frequency)
    if base_year:
        stmt = stmt.where(NasData.base_year == base_year)

    out = []
    for row, audit in db.execute(stmt).all():
        out.append({
            "id": row.id,
            "base_year": row.base_year,
            "series": row.series,
            "year": row.year,
            "year_int": row.year_int,
            "indicator": row.indicator,
            "frequency": row.frequency,
            "estimate_stage": row.estimate_stage,
            "industry": row.industry,
            "subindustry": row.subindustry,
            "institutional_sector": row.institutional_sector,
            "quarter": row.quarter,
            "current_price": _num(row.current_price),
            "constant_price": _num(row.constant_price),
            "unit": row.unit,
            "is_anomaly": row.is_anomaly,
            "flagged_for_review": row.flagged_for_review,
            "anomaly_score": _num(row.anomaly_score),
            "source_run_id": row.source_run_id,
            "ingestion_timestamp": audit.timestamp.isoformat() if audit and audit.timestamp else None,
            "source_file_hash": audit.source_file_hash if audit else None,
        })
    return out
