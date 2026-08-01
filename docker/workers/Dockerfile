FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock* ./
COPY backend ./backend
COPY ai-engine ./ai-engine
COPY ml-engine ./ml-engine

RUN uv sync --package syntrix-backend --no-dev

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app/backend

WORKDIR /app/backend
CMD ["celery", "-A", "app.workers.celery_app.celery_app", "worker", "--loglevel=INFO", "--queues=default", "-c", "2"]
