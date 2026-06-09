"""Shared in-memory price cache (thread-safe)."""

import threading
from typing import Optional


class PriceCache:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._prices: dict[str, dict] = {}

    def set(self, ticker: str, data: dict) -> None:
        with self._lock:
            self._prices[ticker] = data

    def get(self, ticker: str) -> Optional[dict]:
        with self._lock:
            return self._prices.get(ticker)

    def all(self) -> dict[str, dict]:
        with self._lock:
            return dict(self._prices)


price_cache = PriceCache()
