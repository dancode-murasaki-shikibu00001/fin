# FinAlly — Project Plan

FinAlly is a single-container AI trading workstation. Users run one Docker command and get
a live, data-rich trading terminal with an LLM chat assistant at `http://localhost:8000`.

## Architecture

- **Frontend**: Next.js TypeScript, static export (`output: 'export'`), served by FastAPI
- **Backend**: FastAPI (Python/uv), owns all API routes, SSE streaming, DB, market data, LLM
- **Database**: SQLite at `db/finally.db`, volume-mounted, lazily initialized on first request
- **Market data**: GBM simulator by default; Massive API when `MASSIVE_API_KEY` is set
- **AI**: LiteLLM → OpenRouter (Cerebras), structured JSON output for trade execution
- **Real-time**: SSE via `/api/stream/prices`, native `EventSource` on the frontend

## Directory Map

```
finally/
├── frontend/     Next.js project (static export)
├── backend/      FastAPI uv project
│   └── db/       SQL schema, seed logic
├── planning/     Agent reference docs (here)
├── scripts/      Docker start/stop scripts
├── test/         Playwright E2E tests
├── db/           Runtime volume mount (finally.db created here)
├── Dockerfile    Multi-stage: Node 20 build → Python 3.12 runtime
└── docker-compose.yml
```

## Key Contracts Between Agents

### Frontend ↔ Backend
- Frontend calls `/api/*` REST endpoints and `/api/stream/prices` SSE endpoint
- No CORS needed — single origin, same port 8000
- Frontend is a static export: no SSR, no server components

### Backend DB Init
- On first request (or if DB missing), backend creates schema and seeds default data
- Default user: `id="default"`, `cash_balance=10000.0`
- Default watchlist: AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, JPM, V, NFLX

### Environment Variables
- `OPENROUTER_API_KEY` — required for LLM chat
- `MASSIVE_API_KEY` — optional, enables real market data (simulator used if absent)
- `LLM_MOCK=true` — deterministic mock responses for E2E tests and CI

## Full Specification
See `SPEC.md` at the repo root for complete API contracts, schema, UI layout, and more.
