"""Tests for core API endpoints: shape, status codes, and content-type."""

import pytest

from app.market.cache import price_cache


@pytest.fixture(autouse=True)
def seed_prices():
    for t in ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]:
        price_cache.update(t, 100.0)
    yield
    price_cache._prices.clear()


@pytest.mark.asyncio
async def test_health_returns_200(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_health_returns_ok_body(client):
    resp = await client.get("/api/health")
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_portfolio_returns_200(client):
    resp = await client.get("/api/portfolio")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_portfolio_returns_correct_shape(client):
    resp = await client.get("/api/portfolio")
    data = resp.json()
    assert "cash_balance" in data
    assert "total_value" in data
    assert "positions" in data
    assert isinstance(data["positions"], list)
    assert data["cash_balance"] == 10000.0


@pytest.mark.asyncio
async def test_portfolio_history_returns_list(client):
    resp = await client.get("/api/portfolio/history")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_watchlist_returns_200(client):
    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_watchlist_returns_list(client):
    resp = await client.get("/api/watchlist")
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 10
    assert all("ticker" in item for item in data)


@pytest.mark.asyncio
async def test_stream_prices_returns_sse_content_type(client):
    """SSE endpoint must respond with text/event-stream content-type."""
    async with client.stream("GET", "/api/stream/prices") as resp:
        assert resp.status_code == 200
        ct = resp.headers.get("content-type", "")
        assert "text/event-stream" in ct
