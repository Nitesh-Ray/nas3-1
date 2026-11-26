"""Phase 5: Quarterly GDP forecasting with Prophet.

Flow:
  DB (quarterly GDP, constant price) -> ds/y table -> Prophet.fit -> JSON me save
  /forecast/gdp  -> saved model se aage ke quarters predict
  /forecast/backtest -> purane saalon par train, ek saal chhupa ke predict, error naapo
"""
import datetime as dt
import json
import logging
from pathlib import Path

import pandas as pd
from prophet import Prophet
from prophet.serialize import model_from_json, model_to_json
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.database import NasData

# Prophet/cmdstan bahut verbose hai
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "prophet_gdp.json"
META_PATH = MODEL_DIR / "prophet_gdp_meta.json"

INDICATOR = "Gross Domestic Product"
# India ka fiscal year April se shuru: Q1=Apr, Q2=Jul, Q3=Oct, Q4=Jan (agle calendar year me)
QUARTER_START_MONTH = {"Q1": 4, "Q2": 7, "Q3": 10, "Q4": 1}
MONTH_TO_QUARTER = {4: 1, 7: 2, 10: 3, 1: 4}


def fiscal_label(ts: pd.Timestamp) -> str:
    """2025-10-01 -> '2025-26 Q3'"""
    start = ts.year if ts.month >= 4 else ts.year - 1
    return f"{start}-{str(start + 1)[-2:]} Q{MONTH_TO_QUARTER[ts.month]}"


def _new_model() -> Prophet:
    return Prophet(
        seasonality_mode="multiplicative",  # growth badhne par seasonal swing bhi badhta hai
        yearly_seasonality=2,               # quarterly data me saal ke 4 hi points hote hain
        weekly_seasonality=False,
        daily_seasonality=False,
    )


def load_training_df(db: Session, base_year: str = "2011-12", max_year: int | None = None):
    """DB se quarterly GDP (constant price) -> DataFrame[ds, y, year_int]."""
    latest_rev = select(func.max(NasData.revision_id)).scalar_subquery()
    stmt = select(NasData.year_int, NasData.quarter, NasData.constant_price).where(
        NasData.indicator == INDICATOR,
        NasData.frequency == "Quarterly",
        NasData.base_year == base_year,
        NasData.year_int.is_not(None),
        NasData.quarter.is_not(None),
        NasData.constant_price.is_not(None),
        NasData.is_rejected.is_(False),
        NasData.revision_id == latest_rev,
    )
    if max_year is not None:
        stmt = stmt.where(NasData.year_int <= max_year)

    rows = db.execute(stmt).all()
    if not rows:
        return None

    df = pd.DataFrame(rows, columns=["year_int", "quarter", "y"])
    df["y"] = df["y"].astype(float)  # Decimal -> float
    df["year_int"] = df["year_int"].astype(int)
    df["quarter"] = df["quarter"].str.strip().str.upper()
    df = df[df["quarter"].isin(QUARTER_START_MONTH)].copy()

    month = df["quarter"].map(QUARTER_START_MONTH)
    year = df["year_int"] + (df["quarter"] == "Q4").astype(int)  # Q4 = agle calendar year ki Jan
    df["ds"] = pd.to_datetime({"year": year, "month": month, "day": 1})

    # Ek quarter ki multiple rows (alag revisions/series) ho sakti hain -> median lo
    df = df.groupby(["ds", "year_int"], as_index=False)["y"].median().sort_values("ds")
    return df.reset_index(drop=True)


def fit_and_save(db: Session) -> dict:
    df = load_training_df(db)
    if df is None or len(df) < 8:
        raise ValueError("Train karne ke liye kam se kam 8 quarters chahiye.")

    model = _new_model()
    model.fit(df[["ds", "y"]])

    MODEL_DIR.mkdir(exist_ok=True)
    MODEL_PATH.write_text(model_to_json(model))
    meta = {
        "last_trained": dt.datetime.now(dt.timezone.utc).isoformat(),
        "n_points": int(len(df)),
        "first_quarter": fiscal_label(df["ds"].iloc[0]),
        "last_quarter": fiscal_label(df["ds"].iloc[-1]),
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    return meta


def forecast(periods: int = 4) -> list[dict]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Model abhi train nahi hua. Pehle ingestion chalao ya POST /api/forecast/train.")
    model = model_from_json(MODEL_PATH.read_text())
    future = model.make_future_dataframe(periods=periods, freq="QS", include_history=False)
    pred = model.predict(future)
    return [
        {
            "ds": r.ds.strftime("%Y-%m-%d"),
            "quarter": fiscal_label(r.ds),
            "yhat": float(r.yhat),
            "yhat_lower": float(r.yhat_lower),
            "yhat_upper": float(r.yhat_upper),
        }
        for r in pred.itertuples()
    ]


def backtest(db: Session, test_year: int | None = None) -> dict:
    """Ek poora saal chhupao, usse pehle tak train karo, us saal ko predict karke asli se milao."""
    df = load_training_df(db)
    if df is None:
        raise ValueError("DB me quarterly GDP data nahi mila.")

    counts = df.groupby("year_int").size()
    full_years = counts[counts == 4].index
    if len(full_years) == 0:
        raise ValueError("Koi poora saal (4 quarters) nahi mila.")
    if test_year is None:
        test_year = int(full_years.max())

    train = df[df["year_int"] < test_year]
    test = df[df["year_int"] == test_year]
    if len(train) < 8 or test.empty:
        raise ValueError(f"{test_year} ke liye backtest nahi ho sakta (train={len(train)}, test={len(test)}).")

    model = _new_model()
    model.fit(train[["ds", "y"]])
    pred = model.predict(test[["ds"]])

    merged = test[["ds", "y"]].merge(pred[["ds", "yhat"]], on="ds")
    merged["err"] = merged["y"] - merged["yhat"]
    mae = float(merged["err"].abs().mean())
    rmse = float((merged["err"] ** 2).mean() ** 0.5)
    mape = float((merged["err"].abs() / merged["y"]).mean() * 100)

    return {
        "test_year": test_year,
        "train_points": int(len(train)),
        "metrics": {"mae": mae, "rmse": rmse, "mape_pct": round(mape, 2)},
        "details": [
            {
                "quarter": fiscal_label(r.ds),
                "actual": float(r.y),
                "predicted": float(r.yhat),
                "error": float(r.err),
            }
            for r in merged.itertuples()
        ],
    }


def read_meta() -> dict | None:
    return json.loads(META_PATH.read_text()) if META_PATH.exists() else None
