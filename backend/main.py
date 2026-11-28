from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

# Vite dev server (npm run dev) ko API call karne do. Production me same origin hai, CORS ki zaroorat nahi.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["anomalies"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])


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


# ---- Production: React build (dist/) isi server se serve karo ----
DIST = Path(__file__).resolve().parent.parent / "dist"

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        # Galat /api/... path par index.html nahi, seedha 404
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        # Build ki asli file (favicon wagairah) ho to wahi do; path traversal se bachao
        candidate = (DIST / full_path).resolve()
        if candidate.is_file() and DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        # Baaki sab React Router ke liye: index.html (/sectors/Mining refresh par bhi chale)
        return FileResponse(DIST / "index.html")

else:

    @app.get("/")
    def root():
        return {"message": "NAS API is running. Frontend ke liye `npm run build` chalao."}
