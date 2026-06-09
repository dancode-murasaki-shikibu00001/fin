"""Factory: select market data provider based on environment."""

import os

from app.market.interface import MarketDataProvider
from app.market.massive import MassiveClient
from app.market.simulator import GBMSimulator


def create_market_provider() -> MarketDataProvider:
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()
    if api_key:
        interval = float(os.environ.get("MASSIVE_POLL_INTERVAL", "15"))
        return MassiveClient(api_key, poll_interval=interval)
    return GBMSimulator()
