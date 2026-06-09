"""Shared in-memory price cache.

Written by the market data background task, read by portfolio and watchlist routes.
Prices are keyed by ticker symbol.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class PriceEntry:
    price: float
    previous_price: float
    timestamp: str


# Module-level cache — shared across all routes in the same process
prices: dict[str, PriceEntry] = {}


def get_price(ticker: str) -> Optional[float]:
    entry = prices.get(ticker)
    return entry.price if entry else None


def set_price(ticker: str, price: float, previous_price: float, timestamp: str) -> None:
    prices[ticker] = PriceEntry(price=price, previous_price=previous_price, timestamp=timestamp)
