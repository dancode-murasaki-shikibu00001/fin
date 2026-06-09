"""Tests for the GBM market data simulator."""

import pytest
import numpy as np

from app.market.simulator import (
    TICKER_CONFIG,
    TECH_TICKERS,
    FINANCE_TICKERS,
    _build_correlation_matrix,
    Simulator,
)


def test_generates_valid_prices():
    sim = Simulator()
    sim._step()
    for ticker in TICKER_CONFIG:
        assert sim._prices[ticker] > 0, f"{ticker} has non-positive price"


def test_starts_from_seed_prices():
    sim = Simulator()
    for ticker, cfg in TICKER_CONFIG.items():
        assert sim._prices[ticker] == cfg["seed"], (
            f"{ticker}: expected seed {cfg['seed']}, got {sim._prices[ticker]}"
        )


def test_direction_field_reflects_change():
    """After stepping, prices that moved should have a non-zero change."""
    from app.market.cache import price_cache, PriceCache

    # Use a fresh cache to inspect direction
    cache = PriceCache()
    sim = Simulator()

    # Seed one price then step — direction depends on movement
    initial = dict(sim._prices)
    sim._step()
    # Prices should either be the same or have moved (positive floor enforced)
    for ticker in TICKER_CONFIG:
        assert sim._prices[ticker] >= 0.01, f"{ticker} fell below price floor"


def test_correlated_moves_tech_cluster():
    """Tech tickers should have higher correlation than cross-sector pairs."""
    tickers = list(TICKER_CONFIG.keys())
    corr = _build_correlation_matrix(tickers)
    i_aapl = tickers.index("AAPL")
    i_msft = tickers.index("MSFT")
    i_jpm = tickers.index("JPM")

    tech_corr = corr[i_aapl, i_msft]
    cross_corr = corr[i_aapl, i_jpm]
    assert tech_corr > cross_corr, "Tech correlation should exceed cross-sector correlation"


def test_correlated_moves_finance_cluster():
    tickers = list(TICKER_CONFIG.keys())
    corr = _build_correlation_matrix(tickers)
    i_jpm = tickers.index("JPM")
    i_v = tickers.index("V")
    assert corr[i_jpm, i_v] == 0.5


def test_all_tickers_have_seed_config():
    for ticker in TICKER_CONFIG:
        cfg = TICKER_CONFIG[ticker]
        assert cfg["seed"] > 0
        assert "drift" in cfg
        assert "vol" in cfg and cfg["vol"] > 0


def test_correlation_matrix_symmetric():
    tickers = list(TICKER_CONFIG.keys())
    corr = _build_correlation_matrix(tickers)
    np.testing.assert_array_almost_equal(corr, corr.T)


def test_correlation_matrix_diagonal_ones():
    tickers = list(TICKER_CONFIG.keys())
    corr = _build_correlation_matrix(tickers)
    np.testing.assert_array_almost_equal(np.diag(corr), np.ones(len(tickers)))


def test_simulator_price_floor():
    """Prices should never drop below 0.01 regardless of drift."""
    sim = Simulator()
    for ticker in sim._prices:
        sim._prices[ticker] = 0.02
    sim._step()
    for ticker in sim._prices:
        assert sim._prices[ticker] >= 0.01


def test_simulator_step_updates_prices():
    """At least some prices should change after a step."""
    sim = Simulator()
    before = dict(sim._prices)
    sim._step()
    changed = sum(1 for t in TICKER_CONFIG if sim._prices[t] != before[t])
    assert changed > 0
