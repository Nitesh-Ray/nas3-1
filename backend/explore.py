"""Phase 1: CSV ko pehli baar explore karna.
Run (backend folder se): uv run python explore.py
"""
from pathlib import Path

import pandas as pd

CSV = Path(__file__).resolve().parent.parent / "data" / "Merged_Annually_Quarterly.csv"

# utf-8-sig: file ke start me BOM hai, isse pehla column naam kharab nahi hoga
df = pd.read_csv(CSV, encoding="utf-8-sig")

print("1) SHAPE (rows, cols):", df.shape)
print("\n2) COLUMNS + DTYPES:\n", df.dtypes)
print("\n3) NULLS per column:\n", df.isna().sum())
print("\n4) DUPLICATE rows:", df.duplicated().sum())

print("\n5) UNIQUE VALUES (chhote categorical columns):")
for col in ["base_year", "series", "frequency", "revision", "indicator", "quarter", "unit"]:
    print(f"  {col}: {sorted(df[col].dropna().unique().tolist())}")

print("\n6) Industries:", df["industry"].nunique(), "| Sectors:", df["institutional_sector"].nunique())
print("\n7) Years:", sorted(df["year"].dropna().unique().tolist())[:5], "...", sorted(df["year"].dropna().unique().tolist())[-3:])

print("\n8) Rows per (indicator, frequency):")
print(df.groupby(["indicator", "frequency"]).size())

print("\n9) Numeric summary:")
print(df[["current_price", "constant_price"]].describe())
