"""Lazy database initialization: create schema and seed defaults if missing."""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = os.environ.get("DB_PATH", "db/finally.db")

DEFAULT_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]


def _schema_sql() -> str:
    sql_file = Path(__file__).parent / "schema.sql"
    return sql_file.read_text()


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db() -> None:
    """Create tables and seed default data if the database is empty."""
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)

    db = await get_db()
    try:
        await db.executescript(_schema_sql())

        cursor = await db.execute("SELECT COUNT(*) FROM users_profile")
        row = await cursor.fetchone()
        if row[0] == 0:
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                "INSERT INTO users_profile (id, cash_balance, created_at) VALUES (?, ?, ?)",
                ("default", 10000.0, now),
            )
            for ticker in DEFAULT_TICKERS:
                await db.execute(
                    "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), "default", ticker, now),
                )
            await db.commit()
    finally:
        await db.close()
