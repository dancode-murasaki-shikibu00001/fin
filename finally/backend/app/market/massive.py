"""Massive (Polygon.io) REST API market data client."""

import asyncio
import os
from datetime import datetime, timezone

import httpx

from app.market.cache import price_cache
from app.market.interface import MarketDataProvider

_BASE_URL = "https://api.polygon.io"
_DEFAULT_TICKERS = [
    "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
    "NVDA", "META", "JPM", "V", "NFLX",
]


class MassiveClient(MarketDataProvider):
    def __init__(self, api_key: str, poll_interval: float = 15.0) -> None:
        self._api_key = api_key
        self._interval = poll_interval
        self._client = httpx.AsyncClient(timeout=10.0)

    async def update_prices(self) -> None:
        tickers = ",".join(_DEFAULT_TICKERS)
        url = f"{_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers"
        try:
            resp = await self._client.get(url, params={"tickers": tickers, "apiKey": self._api_key})
            resp.raise_for_status()
            snapshots = resp.json().get("tickers", [])
        except Exception:
            return  # Serve stale cache on network errors

        ts = datetime.now(timezone.utc).isoformat()
        for snap in snapshots:
            ticker = snap.get("ticker")
            if not ticker:
                continue
            last_trade = snap.get("lastTrade", {})
            day = snap.get("day", {})
            prev_day = snap.get("prevDay", {})
            price = last_trade.get("p") or day.get("c")
            prev_price = prev_day.get("c") or price
            if price is None:
                continue
            existing = price_cache.get(ticker)
            old_price = existing["price"] if existing else price
            direction = "up" if price > old_price else ("down" if price < old_price else "flat")
            price_cache.set(ticker, {
                "ticker": ticker,
                "price": round(float(price), 2),
                "prev_price": round(float(prev_price), 2),
                "timestamp": ts,
                "direction": direction,
            })

    def get_price(self, ticker: str) -> dict:
        return price_cache.get(ticker) or {}

    async def run(self) -> None:
        while True:
            await self.update_prices()
            await asyncio.sleep(self._interval)
