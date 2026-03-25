# Vyaapar Mitra API — Dockerfile
# Build:  docker build -t vyaapar-api .
# Run:    docker run -p 8000:8000 --env-file .env vyaapar-api

FROM python:3.11-slim

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ──────────────────────────────────────────────────────────
WORKDIR /app

# ── Install Python dependencies ────────────────────────────────────────────────
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy project files ─────────────────────────────────────────────────────────
COPY backend/ ./backend/
COPY execution/ ./execution/
COPY orchestration/ ./orchestration/

# ── Create tmp directory ───────────────────────────────────────────────────────
RUN mkdir -p /app/.tmp

# ── Environment ────────────────────────────────────────────────────────────────
ENV PYTHONPATH=/app/backend:/app/execution:/app/orchestration
ENV TMP_DIR=/app/.tmp

# ── Expose port ────────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Run server ─────────────────────────────────────────────────────────────────
WORKDIR /app/backend
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"
