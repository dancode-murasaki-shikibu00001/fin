# Stage 1: Build Next.js static export
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python/uv backend with frontend static files
FROM python:3.12-slim AS final

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Install Python dependencies
# Build context is the repo root; backend source lives in finally/backend/
COPY finally/backend/pyproject.toml finally/backend/uv.lock* ./backend/
RUN cd backend && uv sync --frozen --no-dev

# Copy backend source
COPY finally/backend/ ./backend/

# Copy frontend static export into static/
# next.config.js distDir is '../backend/static', so the export lands at /app/backend/static
COPY --from=frontend-build /app/backend/static ./static/

# Volume mount point for SQLite database
RUN mkdir -p /app/db

EXPOSE 8000

CMD ["uv", "run", "--project", "backend", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
