"""Watchlist CRUD endpoints with live price enrichment."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.init import get_db
from app.price_cache import prices

router = APIRouter()


class AddTickerRequest(BaseModel):
    ticker: str


class WatchlistItemResponse(BaseModel):
    id: str
    ticker: str
    added_at: str
    current_price: float | None
    prev_price: float | None
    direction: str | None
    change_pct: float | None


class AddTickerResponse(BaseModel):
    id: str
    ticker: str
    added_at: str


def _enrich(row: dict) -> WatchlistItemResponse:
    ticker = row["ticker"]
    entry = prices.get(ticker)

    current_price = entry.price if entry else None
    prev_price = entry.previous_price if entry else None

    direction: str | None = None
    change_pct: float | None = None
    if current_price is not None and prev_price is not None and prev_price != 0:
        diff = current_price - prev_price
        change_pct = round(diff / prev_price * 100, 4)
        direction = "up" if diff > 0 else ("down" if diff < 0 else "flat")

    return WatchlistItemResponse(
        id=row["id"],
        ticker=ticker,
        added_at=row["added_at"],
        current_price=current_price,
        prev_price=prev_price,
        direction=direction,
        change_pct=change_pct,
    )


@router.get("/watchlist", response_model=list[WatchlistItemResponse])
async def get_watchlist():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, ticker, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at",
            ("default",),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()

    return [_enrich(dict(row)) for row in rows]


@router.post("/watchlist", response_model=AddTickerResponse, status_code=201)
async def add_ticker(body: AddTickerRequest):
    ticker = body.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=422, detail="ticker must be non-empty")

    item_id = str(uuid.uuid4())
    added_at = datetime.now(timezone.utc).isoformat()

    db = await get_db()
    try:
        try:
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                (item_id, "default", ticker, added_at),
            )
            await db.commit()
        except Exception as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise HTTPException(status_code=409, detail=f"{ticker} is already in watchlist")
            raise
    finally:
        await db.close()

    return AddTickerResponse(id=item_id, ticker=ticker, added_at=added_at)


@router.delete("/watchlist/{ticker}", status_code=204)
async def remove_ticker(ticker: str):
    ticker = ticker.upper()
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM watchlist WHERE ticker = ? AND user_id = ?",
            (ticker, "default"),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"{ticker} not found in watchlist")
    finally:
        await db.close()
