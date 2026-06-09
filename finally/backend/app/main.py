"""FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.db.init import init_db
from app.routes.portfolio import record_snapshot_standalone
from app.routes import portfolio as portfolio_routes

load_dotenv()

logger = logging.getLogger(__name__)


async def _portfolio_snapshot_loop() -> None:
    while True:
        await asyncio.sleep(30)
        try:
            await record_snapshot_standalone()
        except Exception as exc:
            logger.warning("Portfolio snapshot failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(_portfolio_snapshot_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="FinAlly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio_routes.router)


@app.get("/api/health")
async def health():
    return JSONResponse({"status": "ok"})


# Serve static frontend build (Next.js export) at root if the directory exists
static_dir = Path(__file__).parent.parent.parent / "static"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
