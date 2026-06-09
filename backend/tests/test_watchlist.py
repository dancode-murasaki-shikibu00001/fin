"""Tests for watchlist CRUD endpoints."""

import pytest


@pytest.mark.asyncio
async def test_get_watchlist_returns_default_tickers(client):
    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200
    tickers = [item["ticker"] for item in resp.json()]
    assert "AAPL" in tickers
    assert len(tickers) == 10


@pytest.mark.asyncio
async def test_add_ticker(client):
    resp = await client.post("/api/watchlist", json={"ticker": "SNAP"})
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "SNAP"

    watchlist = await client.get("/api/watchlist")
    tickers = [item["ticker"] for item in watchlist.json()]
    assert "SNAP" in tickers


@pytest.mark.asyncio
async def test_add_ticker_normalizes_to_uppercase(client):
    resp = await client.post("/api/watchlist", json={"ticker": "snap"})
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "SNAP"


@pytest.mark.asyncio
async def test_duplicate_ticker_returns_409(client):
    await client.post("/api/watchlist", json={"ticker": "SNAP"})
    resp = await client.post("/api/watchlist", json={"ticker": "SNAP"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_remove_ticker(client):
    await client.post("/api/watchlist", json={"ticker": "SNAP"})
    resp = await client.delete("/api/watchlist/SNAP")
    assert resp.status_code == 200

    watchlist = await client.get("/api/watchlist")
    tickers = [item["ticker"] for item in watchlist.json()]
    assert "SNAP" not in tickers


@pytest.mark.asyncio
async def test_remove_nonexistent_ticker_returns_404(client):
    resp = await client.delete("/api/watchlist/ZZZZ")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_add_empty_ticker_returns_error(client):
    resp = await client.post("/api/watchlist", json={"ticker": ""})
    assert resp.status_code == 400
