"""GBM (Geometric Brownian Motion) market data simulator."""

import asyncio
import math
import random
from datetime import datetime, timezone

from app.market.cache import price_cache
from app.market.interface import MarketDataProvider

SEED_PRICES: dict[str, float] = {
    "AAPL": 190.0,
    "GOOGL": 175.0,
    "MSFT": 420.0,
    "AMZN": 185.0,
    "TSLA": 250.0,
    "NVDA": 875.0,
    "META": 490.0,
    "JPM": 195.0,
    "V": 275.0,
    "NFLX": 625.0,
}

TECH_TICKERS = frozenset({"AAPL", "GOOGL", "MSFT", "AMZN", "META", "NVDA"})

DRIFT = 0.0001
VOLATILITY = 0.02
TECH_CORRELATION = 0.30
UPDATE_INTERVAL = 0.5
EVENT_EVERY_N_TICKS = 30
EVENT_PROBABILITY = 0.3
EVENT_MIN_MOVE = 0.02
EVENT_MAX_MOVE = 0.05


class GBMSimulator(MarketDataProvider):
    def __init__(self) -> None:
        self._prices = dict(SEED_PRICES)
        self._tick = 0
        ts = datetime.now(timezone.utc).isoformat()
        for ticker, price in self._prices.items():
            price_cache.set(ticker, {
                "ticker": ticker,
                "price": price,
                "prev_price": price,
                "timestamp": ts,
                "change_direction": "neutral",
            })

    async def update_prices(self) -> None:
        self._tick += 1
        tech_shock = random.gauss(0, 1)
        ts = datetime.now(timezone.utc).isoformat()

        for ticker, price in list(self._prices.items()):
            idio = random.gauss(0, 1)
            if ticker in TECH_TICKERS:
                z = math.sqrt(TECH_CORRELATION) * tech_shock + math.sqrt(1 - TECH_CORRELATION) * idio
            else:
                z = idio

            log_ret = (DRIFT - 0.5 * VOLATILITY ** 2) + VOLATILITY * z
            new_price = price * math.exp(log_ret)

            # Occasional sudden event every ~30 ticks
            if self._tick % EVENT_EVERY_N_TICKS == 0 and random.random() < EVENT_PROBABILITY:
                move = random.uniform(EVENT_MIN_MOVE, EVENT_MAX_MOVE) * random.choice([-1, 1])
                new_price *= 1 + move

            new_price = round(new_price, 2)
            change_direction = "up" if new_price > price else ("down" if new_price < price else "neutral")
            self._prices[ticker] = new_price
            price_cache.set(ticker, {
                "ticker": ticker,
                "price": new_price,
                "prev_price": round(price, 2),
                "timestamp": ts,
                "change_direction": change_direction,
            })

    def get_price(self, ticker: str) -> dict:
        return price_cache.get(ticker) or {}

    async def run(self) -> None:
        while True:
            await self.update_prices()
            await asyncio.sleep(UPDATE_INTERVAL)
