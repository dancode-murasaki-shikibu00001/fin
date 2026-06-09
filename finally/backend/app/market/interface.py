"""Abstract interface for market data providers."""

from abc import ABC, abstractmethod


class MarketDataProvider(ABC):
    @abstractmethod
    async def update_prices(self) -> None:
        """Fetch or compute latest prices and update the shared cache."""
        ...

    @abstractmethod
    def get_price(self, ticker: str) -> dict:
        """Return latest price data for a ticker, or {} if unknown."""
        ...

    async def run(self) -> None:
        """Run the provider as a long-lived background task (override if needed)."""
        import asyncio
        while True:
            await self.update_prices()
            await asyncio.sleep(self._interval)
