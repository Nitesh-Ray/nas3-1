"""ETL ke pure functions ke tests (DB ki zaroorat nahi)."""
import pandas as pd

from etl.ingest import clean, detect_anomalies


def raw_csv_frame() -> pd.DataFrame:
    row = {
        "base_year": "2011-12",
        "series": "Current",
        "year": "2022-23",
        "indicator": "Gross Value Added",
        "frequency": "Annual",
        "revision": "Final Estimates",
        "industry": "Mining",
        "subindustry": "",
        "institutional_sector": "",
        "quarter": "",
        "current_price": "1000.5",
        "constant_price": "800",
        "unit": "₹ Crore",
    }
    bad = {**row, "industry": " Farming ", "current_price": "abc"}
    return pd.DataFrame([row, row, bad])  # pehli 2 rows bilkul same


def test_clean_drops_duplicates():
    df, dupes = clean(raw_csv_frame())
    assert dupes == 1
    assert len(df) == 2


def test_clean_renames_revision_and_extracts_year():
    df, _ = clean(raw_csv_frame())
    assert "estimate_stage" in df.columns and "revision" not in df.columns
    assert int(df["year_int"].iloc[0]) == 2022


def test_clean_blank_becomes_null_and_bad_number_is_nan_not_zero():
    df, _ = clean(raw_csv_frame())
    assert df["subindustry"].isna().all()
    assert df["industry"].tolist() == ["Mining", "Farming"]  # strip hua
    assert pd.isna(df["current_price"].iloc[1])  # "abc" -> NaN, 0 nahi


def make_series(values: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "base_year": "2011-12",
            "series": "Current",
            "indicator": "GVA",
            "frequency": "Annual",
            "estimate_stage": "Final",
            "industry": "Mining",
            "subindustry": None,
            "institutional_sector": None,
            "unit": "Cr",
            "current_price": values,
        }
    )


def test_outlier_is_flagged():
    df = detect_anomalies(make_series([100, 101, 102, 103, 104, 105, 106, 107, 108, 10000]))
    assert bool(df["is_anomaly"].iloc[-1]) is True
    assert int(df["is_anomaly"].sum()) == 1
    assert (df["flagged_for_review"] == df["is_anomaly"]).all()


def test_small_group_is_never_flagged():
    df = detect_anomalies(make_series([100, 101, 102, 103, 10000]))  # sirf 5 points
    assert not df["is_anomaly"].any()
