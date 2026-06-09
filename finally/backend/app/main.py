"""FastAPI application entry point."""

import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.db.init import init_db
from app.market.cache import price_cache
from app.market.factory import create_market_provider

load_dotenv()

_market_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _market_task
    await init_db()
    provider = create_market_provider()
    _market_task = asyncio.create_task(provider.run())
    yield
    _market_task.cancel()
    try:
        await _market_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="FinAlly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return JSONResponse({"status": "ok"})


@app.get("/api/stream/prices")
async def stream_prices(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            prices = price_cache.all()
            for data in prices.values():
                yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Serve static frontend build (Next.js export) at root if the directory exists
static_dir = Path(__file__).parent.parent.parent / "static"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
