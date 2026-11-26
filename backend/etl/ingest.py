"""Phase 3: ETL - CSV -> clean -> anomaly flag -> SQLite.

Run (backend folder se):
    uv run python -m etl.ingest

Steps:
  1. File ka SHA-256 hash  -> same file dobara aaye to skip (idempotent)
  2. Audit log row         -> data lineage ke liye
  3. Clean                 -> strip, duplicates hatao, numbers parse karo
  4. Anomaly detection     -> IQR, har "series" ke andar
  5. Revision + bulk insert
"""
import datetime as dt
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import insert, select

from db.database import (
    IngestionAuditLog, NasData, NasDataRevision, SessionLocal, init_db,
)

CSV_PATH = Path(__file__).resolve().parents[2] / "data" / "Merged_Annually_Quarterly.csv"

TEXT_COLS = [
    "base_year", "series", "year", "indicator", "frequency", "estimate_stage",
    "industry", "subindustry", "institutional_sector", "quarter", "unit",
]
NUM_COLS = ["current_price", "constant_price"]

# Ek "series" = ek hi cheez ka time-series (year/quarter ko chhodke baaki sab same)
SERIES_KEYS = [
    "base_year", "series", "indicator", "frequency", "estimate_stage",
    "industry", "subindustry", "institutional_sector", "unit",
]
MIN_GROUP_SIZE = 8  # isse kam points par IQR bharosemand nahi


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Column names, text, duplicates, numbers saaf karo."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df = df.rename(columns={"revision": "estimate_stage"})  # DB me alag naam

    missing = [c for c in TEXT_COLS + NUM_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV me ye columns nahi mile: {missing}")

    for c in TEXT_COLS:
        df[c] = df[c].astype("string").str.strip().replace("", pd.NA)

    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    dupes = before - len(df)

    # "2022-23" -> 2022 (sorting/filtering ke liye)
    df["year_int"] = pd.to_numeric(df["year"].str.extract(r"^(\d{4})")[0], errors="coerce")
    df["year_int"] = df["year_int"].astype("Int64")

    # Missing numbers ko 0 nahi banate (0 asli value ban jati hai) -> NaN/None rehne do
    for c in NUM_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    return df, dupes


def detect_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """IQR rule: value [Q1 - 1.5*IQR, Q3 + 1.5*IQR] ke bahar -> anomaly.
    Group = ek series (SERIES_KEYS). Z-score sabhi rows ke liye nikalte hain.
    """
    g = df.groupby(SERIES_KEYS, dropna=False)["current_price"]
    q1 = g.transform(lambda s: s.quantile(0.25))
    q3 = g.transform(lambda s: s.quantile(0.75))
    mean = g.transform("mean")
    std = g.transform("std")
    n = g.transform("count")

    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    x = df["current_price"]

    df["is_anomaly"] = ((x < lower) | (x > upper)) & (n >= MIN_GROUP_SIZE)
    df["flagged_for_review"] = df["is_anomaly"]
    df["anomaly_score"] = np.where(std > 0, (x - mean) / std, 0.0).round(4)
    return df


def run_ingestion(path: Path = CSV_PATH) -> None:
    init_db()
    db = SessionLocal()
    audit = None
    try:
        if not path.exists():
            raise FileNotFoundError(f"File nahi mili: {path}")

        digest = file_sha256(path)
        already = db.scalar(
            select(IngestionAuditLog.id).where(
                IngestionAuditLog.source_file_hash == digest,
                IngestionAuditLog.success.is_(True),
            )
        )
        if already:
            print("Ye file pehle hi ingest ho chuki hai. Skip.")
            return

        # Audit log pehle banao taaki har row ko source_run_id mil sake
        audit = IngestionAuditLog(
            rows_processed=0, source_file_hash=digest, success=False, error_message="Started"
        )
        db.add(audit)
        db.commit()

        print("1) CSV padh rahe hain...")
        raw = pd.read_csv(path, encoding="utf-8-sig")  # utf-8-sig = BOM hatata hai
        print(f"   {len(raw)} rows padhi")

        print("2) Clean kar rahe hain...")
        df, dupes = clean(raw)
        print(f"   {dupes} duplicate rows hataye -> {len(df)} bachi")

        print("3) Anomaly detection...")
        df = detect_anomalies(df)
        print(f"   {int(df['is_anomaly'].sum())} rows flag hui")

        revision = NasDataRevision(
            revision_name=f"Ingestion_{dt.datetime.now():%Y%m%d_%H%M%S}",
            release_date=dt.date.today(),
        )
        db.add(revision)
        db.commit()

        df["source_run_id"] = audit.id
        df["revision_id"] = revision.revision_id
        df["is_rejected"] = False

        # pandas NaN/NA -> Python None (DB me NULL jaye)
        cols = [c.name for c in NasData.__table__.columns if c.name != "id"]
        records = (
            df[cols].astype(object).where(df[cols].notna(), None).to_dict(orient="records")
        )

        print(f"4) {len(records)} rows DB me daal rahe hain...")
        db.execute(insert(NasData), records)

        audit.rows_processed = len(records)
        audit.success = True
        audit.error_message = None
        db.commit()
        print("Ingestion poora hua!")

        # Naye data par Prophet dobara train (fail ho to ingestion fail nahi maanenge)
        try:
            from ml.gdp_forecast import fit_and_save

            meta = fit_and_save(db)
            print(f"5) Prophet train hua: {meta['n_points']} quarters ({meta['first_quarter']} -> {meta['last_quarter']})")
        except Exception as e:
            print(f"Model train nahi hua (baad me POST /api/forecast/train se kar lena): {e}")

    except Exception as e:
        db.rollback()
        print(f"Ingestion fail: {e}")
        if audit is not None:
            audit.success = False
            audit.error_message = str(e)[:500]
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run_ingestion()
