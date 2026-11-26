"""Forecast endpoints (patli layer: asli kaam ml/gdp_forecast.py me)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from ml import gdp_forecast as gf

router = APIRouter()


@router.get("/gdp")
def forecast_gdp(periods: int = Query(4, ge=1, le=12)):
    """Aage ke `periods` quarters ka GDP forecast (yhat + lower/upper band)."""
    try:
        return {"forecast": gf.forecast(periods)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/history")
def training_history(db: Session = Depends(get_db)):
    """Model jis data par train hota hai (chart me asli line dikhane ke liye)."""
    df = gf.load_training_df(db)
    if df is None:
        raise HTTPException(status_code=404, detail="Quarterly GDP data nahi mila.")
    return {
        "history": [
            {"ds": r.ds.strftime("%Y-%m-%d"), "quarter": gf.fiscal_label(r.ds), "y": float(r.y)}
            for r in df.itertuples()
        ]
    }


@router.get("/backtest")
def backtest(test_year: int | None = None, db: Session = Depends(get_db)):
    """Ek saal chhupa ke predict karo, MAE / RMSE / MAPE se model ko parkho."""
    try:
        return gf.backtest(db, test_year)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/train")
def train(db: Session = Depends(get_db)):
    """Model dobara train karo (ingestion ke baad bhi apne aap hota hai)."""
    try:
        return {"status": "trained", **gf.fit_and_save(db)}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/status")
def model_status():
    return gf.read_meta() or {"status": "not_trained"}
