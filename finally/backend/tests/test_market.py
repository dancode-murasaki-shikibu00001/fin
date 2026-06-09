"""Tests for the market data module."""

import asyncio
import math
import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.market.cache import PriceCache
from app.market.factory import create_market_provider
from app.market.interface import MarketDataProvider
from app.market.massive import MassiveClient
from app.market.simulator import DRIFT, SEED_PRICES, TECH_TICKERS, VOLATILITY, GBMSimulator


# ---------------------------------------------------------------------------
# PriceCache
# ---------------------------------------------------------------------------


class TestPriceCache:
    def test_set_and_get(self):
        cache = PriceCache()
        data = {"ticker": "AAPL", "price": 190.0, "prev_price": 188.0, "timestamp": "t", "direction": "up"}
        cache.set("AAPL", data)
        assert cache.get("AAPL") == data

    def test_get_missing_returns_none(self):
        cache = PriceCache()
        assert cache.get("UNKNOWN") is None

    def test_all_returns_copy(self):
        cache = PriceCache()
        cache.set("AAPL", {"price": 190.0})
        cache.set("MSFT", {"price": 420.0})
        result = cache.all()
        assert set(result.keys()) == {"AAPL", "MSFT"}
        # Adding a key to the returned dict should not affect the cache
        result["NEW"] = {"price": 0.0}
        assert cache.get("NEW") is None

    def test_overwrite(self):
        cache = PriceCache()
        cache.set("AAPL", {"price": 190.0})
        cache.set("AAPL", {"price": 195.0})
        assert cache.get("AAPL")["price"] == 195.0

    def test_thread_safety(self):
        """Multiple threads writing to the cache should not corrupt state."""
        import threading

        cache = PriceCache()
        errors = []

        def writer(ticker, price):
            try:
                for _ in range(100):
                    cache.set(ticker, {"price": price})
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=writer, args=(f"T{i}", float(i))) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors
        assert len(cache.all()) == 10


# ---------------------------------------------------------------------------
# GBMSimulator
# ---------------------------------------------------------------------------


class TestGBMSimulator:
    def test_interface_conformance(self):
        assert issubclass(GBMSimulator, MarketDataProvider)

    def test_initializes_with_seed_prices(self):
        sim = GBMSimulator()
        for ticker, price in SEED_PRICES.items():
            data = sim.get_price(ticker)
            assert data["ticker"] == ticker
            assert data["price"] == price
            assert data["direction"] == "flat"

    def test_get_price_unknown_returns_empty(self):
        sim = GBMSimulator()
        assert sim.get_price("XXXX") == {}

    async def test_update_prices_changes_prices(self):
        sim = GBMSimulator()
        before = {t: sim.get_price(t)["price"] for t in SEED_PRICES}
        await sim.update_prices()
        after = {t: sim.get_price(t)["price"] for t in SEED_PRICES}
        # After one tick prices should (with overwhelming probability) differ
        assert before != after

    async def test_update_prices_returns_valid_format(self):
        sim = GBMSimulator()
        await sim.update_prices()
        for ticker in SEED_PRICES:
            data = sim.get_price(ticker)
            assert "ticker" in data
            assert "price" in data
            assert "prev_price" in data
            assert "timestamp" in data
            assert data["direction"] in {"up", "down", "flat"}

    async def test_direction_matches_price_change(self):
        sim = GBMSimulator()
        initial_prices = {t: sim.get_price(t)["price"] for t in SEED_PRICES}
        # Manually set a specific price and force a predictable next price via monkeypatching
        # We just verify the direction logic is consistent with the price delta
        await sim.update_prices()
        for ticker in SEED_PRICES:
            data = sim.get_price(ticker)
            prev = data["prev_price"]
            price = data["price"]
            if price > prev:
                assert data["direction"] == "up"
            elif price < prev:
                assert data["direction"] == "down"
            else:
                assert data["direction"] == "flat"

    async def test_prices_remain_positive(self):
        sim = GBMSimulator()
        for _ in range(20):
            await sim.update_prices()
        for ticker in SEED_PRICES:
            assert sim.get_price(ticker)["price"] > 0

    async def test_gbm_price_in_plausible_range(self):
        """After 50 ticks, prices should stay within 3x / 0.33x of seed."""
        sim = GBMSimulator()
        for _ in range(50):
            await sim.update_prices()
        for ticker, seed in SEED_PRICES.items():
            price = sim.get_price(ticker)["price"]
            assert seed * 0.33 <= price <= seed * 3.0, (
                f"{ticker}: {price} out of plausible range for seed {seed}"
            )

    async def test_tech_stock_correlation_structure(self):
        """Tech tickers should exist and be tracked."""
        sim = GBMSimulator()
        await sim.update_prices()
        for ticker in TECH_TICKERS:
            assert ticker in SEED_PRICES
            data = sim.get_price(ticker)
            assert data["price"] > 0

    async def test_event_fires_at_correct_tick(self):
        """At tick 30, an event should occasionally trigger a large move."""
        sim = GBMSimulator()
        with patch("app.market.simulator.random.random", return_value=0.0):  # always fire event
            with patch("app.market.simulator.random.gauss", return_value=0.0):  # no drift
                with patch("app.market.simulator.random.uniform", return_value=0.04):  # +4% event
                    with patch("app.market.simulator.random.choice", return_value=1):
                        # Advance to tick 30
                        for _ in range(29):
                            await sim.update_prices()
                        prices_before_event = {t: sim.get_price(t)["price"] for t in SEED_PRICES}
                        await sim.update_prices()  # tick 30 — event fires on at least one ticker
                        # At least one ticker should have moved more than normal GBM would allow
                        # (with gauss=0 and uniform=0.04, each ticker gets a 4% event)
                        moved = False
                        for ticker, before in prices_before_event.items():
                            after = sim.get_price(ticker)["price"]
                            if abs(after - before) / before > 0.01:
                                moved = True
                                break
                        assert moved


# ---------------------------------------------------------------------------
# MassiveClient
# ---------------------------------------------------------------------------


class TestMassiveClient:
    def test_interface_conformance(self):
        assert issubclass(MassiveClient, MarketDataProvider)

    def test_init(self):
        client = MassiveClient("test-key", poll_interval=30.0)
        assert client._api_key == "test-key"
        assert client._interval == 30.0

    async def test_update_prices_parses_response(self):
        client = MassiveClient("test-key")
        cache = PriceCache()

        payload = {
            "tickers": [
                {
                    "ticker": "AAPL",
                    "lastTrade": {"p": 192.5},
                    "day": {"c": 191.0},
                    "prevDay": {"c": 188.0},
                },
                {
                    "ticker": "MSFT",
                    "lastTrade": {"p": 425.0},
                    "day": {"c": 424.0},
                    "prevDay": {"c": 420.0},
                },
            ]
        }

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = payload

        with patch.object(client._client, "get", new=AsyncMock(return_value=mock_resp)):
            with patch("app.market.massive.price_cache", cache):
                await client.update_prices()

        aapl = cache.get("AAPL")
        assert aapl is not None
        assert aapl["price"] == 192.5
        assert aapl["prev_price"] == 188.0
        assert aapl["ticker"] == "AAPL"
        assert aapl["direction"] in {"up", "down", "flat"}

    async def test_update_prices_uses_day_close_when_no_last_trade(self):
        client = MassiveClient("test-key")
        cache = PriceCache()

        payload = {
            "tickers": [
                {
                    "ticker": "GOOGL",
                    "lastTrade": {},
                    "day": {"c": 176.0},
                    "prevDay": {"c": 174.0},
                },
            ]
        }

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = payload

        with patch.object(client._client, "get", new=AsyncMock(return_value=mock_resp)):
            with patch("app.market.massive.price_cache", cache):
                await client.update_prices()

        googl = cache.get("GOOGL")
        assert googl is not None
        assert googl["price"] == 176.0

    async def test_update_prices_skips_tickers_with_no_price(self):
        client = MassiveClient("test-key")
        cache = PriceCache()

        payload = {
            "tickers": [
                {
                    "ticker": "BAD",
                    "lastTrade": {},
                    "day": {},
                    "prevDay": {},
                },
            ]
        }

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = payload

        with patch.object(client._client, "get", new=AsyncMock(return_value=mock_resp)):
            with patch("app.market.massive.price_cache", cache):
                await client.update_prices()

        assert cache.get("BAD") is None

    async def test_update_prices_handles_network_error_gracefully(self):
        client = MassiveClient("test-key")
        cache = PriceCache()

        with patch.object(client._client, "get", new=AsyncMock(side_effect=httpx.ConnectError("fail"))):
            with patch("app.market.massive.price_cache", cache):
                # Should not raise
                await client.update_prices()

        assert cache.all() == {}

    def test_get_price_from_cache(self):
        client = MassiveClient("test-key")
        cache = PriceCache()
        cache.set("AAPL", {"ticker": "AAPL", "price": 190.0})

        with patch("app.market.massive.price_cache", cache):
            result = client.get_price("AAPL")
        assert result["price"] == 190.0

    def test_get_price_missing_returns_empty(self):
        client = MassiveClient("test-key")
        cache = PriceCache()
        with patch("app.market.massive.price_cache", cache):
            assert client.get_price("UNKNOWN") == {}


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


class TestFactory:
    def test_returns_simulator_without_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("MASSIVE_API_KEY", None)
            provider = create_market_provider()
        assert isinstance(provider, GBMSimulator)

    def test_returns_simulator_when_key_is_empty(self):
        with patch.dict(os.environ, {"MASSIVE_API_KEY": ""}):
            provider = create_market_provider()
        assert isinstance(provider, GBMSimulator)

    def test_returns_massive_client_when_key_set(self):
        with patch.dict(os.environ, {"MASSIVE_API_KEY": "test-key-123"}):
            provider = create_market_provider()
        assert isinstance(provider, MassiveClient)

    def test_massive_client_uses_default_interval(self):
        with patch.dict(os.environ, {"MASSIVE_API_KEY": "key"}, clear=False):
            os.environ.pop("MASSIVE_POLL_INTERVAL", None)
            provider = create_market_provider()
        assert provider._interval == 15.0

    def test_massive_client_uses_custom_interval(self):
        with patch.dict(os.environ, {"MASSIVE_API_KEY": "key", "MASSIVE_POLL_INTERVAL": "30"}):
            provider = create_market_provider()
        assert provider._interval == 30.0
