"""Tests for portfolio endpoints: trade execution, positions, P&L."""

import pytest

from app.market.cache import price_cache


@pytest.fixture(autouse=True)
def seed_prices():
    price_cache.update("AAPL", 150.0)
    price_cache.update("GOOGL", 175.0)
    price_cache.update("TSLA", 250.0)
    yield
    price_cache._prices.clear()


@pytest.mark.asyncio
async def test_buy_deducts_cash(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    assert resp.status_code == 200

    portfolio = await client.get("/api/portfolio")
    data = portfolio.json()
    assert data["cash_balance"] == 10000.0 - (10 * 150.0)


@pytest.mark.asyncio
async def test_buy_updates_positions(client):
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    portfolio = await client.get("/api/portfolio")
    positions = portfolio.json()["positions"]
    assert len(positions) == 1
    assert positions[0]["ticker"] == "AAPL"
    assert positions[0]["quantity"] == 10
    assert positions[0]["avg_cost"] == 150.0


@pytest.mark.asyncio
async def test_buy_weighted_avg_cost(client):
    """Two buys at different prices → weighted average cost."""
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    # Update price to 200 for second buy
    price_cache.update("AAPL", 200.0)
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    portfolio = await client.get("/api/portfolio")
    pos = portfolio.json()["positions"][0]
    # (10*150 + 10*200) / 20 = 175
    assert pos["avg_cost"] == 175.0
    assert pos["quantity"] == 20


@pytest.mark.asyncio
async def test_sell_increases_cash(client):
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 5, "side": "sell"},
    )
    portfolio = await client.get("/api/portfolio")
    data = portfolio.json()
    # Bought 10 @ 150 = -1500, sold 5 @ 150 = +750 → 10000 - 1500 + 750 = 9250
    assert data["cash_balance"] == 9250.0


@pytest.mark.asyncio
async def test_sell_more_than_owned_returns_error(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "sell"},
    )
    assert resp.status_code == 400
    assert "insufficient shares" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_buy_insufficient_cash_returns_error(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10000, "side": "buy"},
    )
    assert resp.status_code == 400
    assert "insufficient cash" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_pnl_calculation(client):
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    portfolio = await client.get("/api/portfolio")
    pos = portfolio.json()["positions"][0]
    # Price still 150, avg_cost 150 → P&L = 0
    assert pos["unrealized_pnl"] == 0.0
    assert pos["pnl_percent"] == 0.0


@pytest.mark.asyncio
async def test_sell_entire_position_removes_it(client):
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "buy"},
    )
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 10, "side": "sell"},
    )
    portfolio = await client.get("/api/portfolio")
    assert portfolio.json()["positions"] == []


@pytest.mark.asyncio
async def test_invalid_side_returns_error(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 1, "side": "short"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_zero_quantity_returns_error(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "quantity": 0, "side": "buy"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_no_price_available_returns_error(client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "ZZZZ", "quantity": 1, "side": "buy"},
    )
    assert resp.status_code == 400
    assert "no price" in resp.json()["detail"].lower()
