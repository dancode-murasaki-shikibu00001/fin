"""Tests for LLM chat integration: structured output parsing, mock mode, trade validation."""

import os

os.environ["LLM_MOCK"] = "true"

import pytest

from app.market.cache import price_cache


@pytest.fixture(autouse=True)
def seed_prices():
    price_cache.update("AAPL", 150.0)
    price_cache.update("TSLA", 250.0)
    for t in ["GOOGL", "MSFT", "AMZN", "NVDA", "META", "JPM", "V", "NFLX"]:
        price_cache.update(t, 100.0)
    yield
    price_cache._prices.clear()


@pytest.mark.asyncio
async def test_llm_mock_returns_response(client):
    """LLM_MOCK=true should return a deterministic response without calling OpenRouter."""
    resp = await client.post("/api/chat", json={"message": "hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert len(data["message"]) > 0


@pytest.mark.asyncio
async def test_structured_output_has_required_fields(client):
    """Response must have 'message'; trades and watchlist_changes are optional."""
    resp = await client.post("/api/chat", json={"message": "show portfolio"})
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    # trades and watchlist_changes may be null
    assert "trades" in data
    assert "watchlist_changes" in data


@pytest.mark.asyncio
async def test_structured_output_trades_schema(client):
    """When trades are returned, each must have ticker, side, quantity."""
    resp = await client.post("/api/chat", json={"message": "buy some AAPL"})
    assert resp.status_code == 200
    data = resp.json()
    if data["trades"]:
        for trade in data["trades"]:
            assert "ticker" in trade
            assert "side" in trade
            assert trade["side"] in ("buy", "sell")
            assert "quantity" in trade
            assert trade["quantity"] > 0


@pytest.mark.asyncio
async def test_structured_output_watchlist_schema(client):
    """When watchlist_changes are returned, each must have ticker and action."""
    resp = await client.post("/api/chat", json={"message": "add PYPL to watchlist"})
    assert resp.status_code == 200
    data = resp.json()
    if data["watchlist_changes"]:
        for change in data["watchlist_changes"]:
            assert "ticker" in change
            assert "action" in change
            assert change["action"] in ("add", "remove")


@pytest.mark.asyncio
async def test_trade_validation_in_chat_flow_buy(client):
    """Chat-triggered buy should succeed and reduce cash."""
    resp = await client.post("/api/chat", json={"message": "buy some AAPL"})
    data = resp.json()
    assert resp.status_code == 200
    # Mock triggers a buy; check no error appended
    assert "Errors" not in data["message"]

    portfolio = await client.get("/api/portfolio")
    assert portfolio.json()["cash_balance"] < 10000.0


@pytest.mark.asyncio
async def test_trade_validation_in_chat_flow_sell_without_position(client):
    """Chat sell without owning shares should report an error in the message."""
    resp = await client.post("/api/chat", json={"message": "sell some AAPL"})
    data = resp.json()
    assert resp.status_code == 200
    # Mock tries to sell; should fail and append error
    assert "Insufficient" in data["message"] or "Errors" in data["message"]


@pytest.mark.asyncio
async def test_chat_buy_then_sell_succeeds(client):
    """Buy first, then sell should complete without errors."""
    await client.post("/api/chat", json={"message": "buy some AAPL"})
    resp = await client.post("/api/chat", json={"message": "sell some AAPL"})
    data = resp.json()
    assert resp.status_code == 200
    assert "Insufficient" not in data["message"]


@pytest.mark.asyncio
async def test_watchlist_change_via_chat(client):
    resp = await client.post("/api/chat", json={"message": "add PYPL to watchlist"})
    data = resp.json()
    assert resp.status_code == 200
    assert data["watchlist_changes"] is not None
    assert data["watchlist_changes"][0]["ticker"] == "PYPL"
    assert data["watchlist_changes"][0]["action"] == "add"
