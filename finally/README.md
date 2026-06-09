# FinAlly — AI Trading Workstation

A visually stunning, single-container AI trading workstation. Stream live market data,
manage a simulated portfolio, and chat with an LLM assistant that can execute trades on
your behalf.

## Quick Start

### macOS / Linux

```bash
# Copy and fill in your API key
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY

# Start the app
./scripts/start_mac.sh

# Open http://localhost:8000 in your browser
```

### Windows (PowerShell)

```powershell
# Copy and fill in your API key
Copy-Item .env.example .env
# Edit .env and set OPENROUTER_API_KEY

# Start the app
.\scripts\start_windows.ps1

# Browser opens automatically to http://localhost:8000
```

### docker-compose (any platform)

```bash
cp .env.example .env
# Edit .env
docker-compose up --build
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- An [OpenRouter](https://openrouter.ai/) API key (free tier works)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | LLM chat functionality |
| `MASSIVE_API_KEY` | No | Real market data (simulator used if absent) |
| `LLM_MOCK` | No | Set `true` for deterministic mock responses (testing) |

## Stop the App

```bash
# macOS/Linux
./scripts/stop_mac.sh

# Windows
.\scripts\stop_windows.ps1

# docker-compose
docker-compose down
```

Data persists in a Docker volume (`finally-data`) across restarts. To reset:

```bash
docker volume rm finally-data
```

## Development

See `planning/PLAN.md` for architecture overview and agent contracts.
See `SPEC.md` for the full specification.

- Frontend: `finally/frontend/` — Next.js TypeScript
- Backend: `finally/backend/` — FastAPI (Python/uv)
- E2E tests: `finally/test/` — Playwright
