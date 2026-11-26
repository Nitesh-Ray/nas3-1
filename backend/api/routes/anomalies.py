"""Anomaly review: list / approve / reject (human-in-the-loop)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.database import NasData, get_db

router = APIRouter()


def _item(r: NasData) -> dict:
    return {
        "id": r.id,
        "indicator": r.indicator,
        "industry": r.industry,
        "year": r.year,
        "quarter": r.quarter,
        "frequency": r.frequency,
        "base_year": r.base_year,
        "series": r.series,
        "current_price": float(r.current_price) if r.current_price is not None else None,
        "anomaly_score": float(r.anomaly_score) if r.anomaly_score is not None else None,
        "unit": r.unit,
    }


def _get_or_404(db: Session, row_id: int) -> NasData:
    row = db.get(NasData, row_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Data row not found")
    return row


@router.get("/")
def list_anomalies(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Review ke liye flag hui rows, sabse zyada 'door' wali pehle."""
    where = (NasData.flagged_for_review.is_(True), NasData.is_rejected.is_(False))
    total = db.scalar(select(func.count()).select_from(NasData).where(*where))
    rows = db.scalars(
        select(NasData)
        .where(*where)
        .order_by(func.abs(NasData.anomaly_score).desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return {"total": total, "limit": limit, "offset": offset, "items": [_item(r) for r in rows]}


@router.post("/{row_id}/approve")
def approve(row_id: int, db: Session = Depends(get_db)):
    """Data sahi hai -> flag hatao."""
    row = _get_or_404(db, row_id)
    row.flagged_for_review = False
    db.commit()
    return {"status": "approved", "id": row_id}


@router.post("/{row_id}/reject")
def reject(row_id: int, db: Session = Depends(get_db)):
    """Data galat hai -> soft delete. Row DB me rehti hai (audit trail), bas API se chhup jaati hai."""
    row = _get_or_404(db, row_id)
    row.is_rejected = True
    row.flagged_for_review = False
    db.commit()
    return {"status": "rejected", "id": row_id}
