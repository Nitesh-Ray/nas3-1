from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from api.routes import anomalies, data, forecast
from db.database import SessionLocal, init_db
from ml.gdp_forecast import read_meta

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # startup: tables nahi hain to bana do
    yield  # app chalti rehti hai
    # shutdown ka kaam (agar ho) yahan aata


app = FastAPI(title="NAS API", lifespan=lifespan)

# Vite dev server (bun run dev) ko API call karne do
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["anomalies"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])



@app.get("/")
def root():
    return {"message": "NAS API is running (SQLite)"}


@app.get("/health")
def health():
    status = {"status": "ok", "database": "ok", "prophet_model": "not_trained"}
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        status.update(status="error", database=f"error: {e}")
    finally:
        db.close()
    meta = read_meta()
    if meta:
        status["prophet_model"] = f"last_trained: {meta['last_trained']}"
    return status
