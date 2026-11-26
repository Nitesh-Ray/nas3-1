# NAS Insights

India ke **National Accounts Statistics** (GDP, GVA, sectors) ka full-stack dashboard: CSV → ETL → SQLite → FastAPI → React, aur Prophet se quarterly GDP forecast.

```
CSV ──► ETL (clean, dedupe, anomaly flag, audit) ──► SQLite
                                                       │
                          FastAPI (REST + Prophet) ◄───┘
                                  │  /api (Vite proxy)
                          React + Recharts dashboard
```

## Stack
- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2, pandas, Prophet, uv
- **Frontend:** React 19, TypeScript, Vite, Tailwind v4, React Query, Recharts, React Router
- **Tests:** pytest (backend), Vitest (frontend)

## Setup

```powershell
# Backend (backend/ folder)
cd backend
uv sync
uv run python -m etl.ingest                    # CSV -> DB (+ Prophet train)
uv run uvicorn main:app --reload --port 8000   # http://localhost:8000/docs

# Frontend (project root, naye terminal me)
npm install
npm run dev                                    # http://localhost:5173
```

Zero se dobara: `backend/nas_data.db` delete karo aur ingest chalao.
Ingest "already ingested" bole to model manually train karo: `POST /api/forecast/train`.

## Tests
```powershell
cd backend ; uv add --dev pytest httpx ; uv run pytest   # ek baar `uv add`, phir sirf pytest
cd .. ; npm install -D vitest ; npm test
```

## API
| Endpoint | Kaam |
|---|---|
| `GET /health` | server, DB aur model status |
| `GET /api/data/status` | latest ingestion run |
| `GET /api/data/all` | data + provenance (`?indicator=&frequency=&base_year=`) |
| `GET /api/anomalies/` | flagged rows (`limit`, `offset`) |
| `POST /api/anomalies/{id}/approve` · `/reject` | review (reject = soft delete) |
| `GET /api/forecast/gdp?periods=4` | Prophet forecast + confidence band |
| `GET /api/forecast/history` · `/backtest` · `/status` | training data, backtest (MAE/RMSE/MAPE), model info |
| `POST /api/forecast/train` | model dobara train |

## Design decisions
- **Idempotent ingestion:** file ka SHA-256; same file dobara = skip.
- **Provenance:** har data row `source_run_id` se audit log tak trace hoti hai.
- **Anomalies flag hoti hain, delete nahi:** IQR rule, har series ke andar. Review ke baad approve ya soft-reject.
- **Missing = NULL, 0 nahi.** Frontend `null` ko `—` dikhata hai.
- **Forecast:** quarterly GDP, constant prices (base 2011-12), fiscal quarters (Q1 = Apr–Jun).

## Structure
```
backend/  main.py · api/routes · db · etl · ml · tests
src/      pages · components (+charts) · hooks · lib (api-client, data-utils, types)
data/     Merged_Annually_Quarterly.csv
```

## Aage kya ho sakta hai
Production build ko FastAPI se serve karna, Docker, GraphQL live feed, sector drill-down page, Prophet me holidays/regressors.
