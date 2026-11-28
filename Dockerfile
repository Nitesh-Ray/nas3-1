# ---------- Stage 1: React build ----------
FROM node:22-slim AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build            # -> /web/dist

# ---------- Stage 2: FastAPI + data + dist ----------
FROM python:3.14-slim
# Prophet ke liye OpenMP library
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/backend
# Pehle sirf dependencies (Docker cache: code badalne par dobara install nahi hota)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./
COPY data /app/data
COPY --from=web /web/dist /app/dist

# Build ke waqt hi DB banao aur Prophet train karo -> container turant start hota hai
RUN uv run --no-sync python -m etl.ingest

ENV PATH="/app/backend/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
