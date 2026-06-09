"""Portfolio API routes: positions, trades, portfolio snapshots, P&L."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app import price_cache
from app.db.init import get_db
from app.models import (
    ExecuteTradeResponse,
    PortfolioResponse,
    PortfolioSnapshot,
    Position,
    TradeRequest,
    TradeResponse,
)

router = APIRouter(prefix="/api/portfolio")

_USER_ID = "default"


@router.get("", response_model=PortfolioResponse)
async def get_portfolio():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = ?", (_USER_ID,)
        )
        row = await cursor.fetchone()
        cash_balance = row["cash_balance"] if row else 0.0

        cursor = await db.execute(
            "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ?",
            (_USER_ID,),
        )
        position_rows = await cursor.fetchall()

        positions = []
        positions_value = 0.0
        for r in position_rows:
            ticker = r["ticker"]
            quantity = r["quantity"]
            avg_cost = r["avg_cost"]
            current_price = price_cache.get_price(ticker) or avg_cost
            unrealized_pnl = (current_price - avg_cost) * quantity
            pnl_pct = (current_price - avg_cost) / avg_cost * 100 if avg_cost else 0.0
            positions_value += quantity * current_price
            positions.append(
                Position(
                    ticker=ticker,
                    quantity=quantity,
                    avg_cost=avg_cost,
                    current_price=current_price,
                    unrealized_pnl=unrealized_pnl,
                    pnl_pct=pnl_pct,
                )
            )

        total_value = cash_balance + positions_value
        total_pnl = sum(p.unrealized_pnl for p in positions)
        return PortfolioResponse(
            cash_balance=cash_balance,
            total_value=total_value,
            total_pnl=total_pnl,
            positions=positions,
        )
    finally:
        await db.close()


@router.post("/trade", response_model=ExecuteTradeResponse)
async def execute_trade(request: TradeRequest):
    ticker = request.ticker.upper()
    quantity = request.quantity
    side = request.side

    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")

    current_price = price_cache.get_price(ticker)
    if current_price is None:
        raise HTTPException(status_code=400, detail=f"No price available for {ticker}")

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = ?", (_USER_ID,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="User profile not found")
        cash_balance = row["cash_balance"]

        trade_cost = quantity * current_price
        now = datetime.now(timezone.utc).isoformat()

        if side == "buy":
            if cash_balance < trade_cost:
                return ExecuteTradeResponse(
                    success=False,
                    error=f"Insufficient funds: need ${trade_cost:.2f}, have ${cash_balance:.2f}",
                )
            await db.execute(
                "UPDATE users_profile SET cash_balance = cash_balance - ? WHERE id = ?",
                (trade_cost, _USER_ID),
            )
            cursor = await db.execute(
                "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                (_USER_ID, ticker),
            )
            existing = await cursor.fetchone()
            if existing:
                old_qty = existing["quantity"]
                old_cost = existing["avg_cost"]
                new_qty = old_qty + quantity
                new_avg_cost = (old_qty * old_cost + quantity * current_price) / new_qty
                await db.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ?"
                    " WHERE user_id = ? AND ticker = ?",
                    (new_qty, new_avg_cost, now, _USER_ID, ticker),
                )
            else:
                await db.execute(
                    "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at)"
                    " VALUES (?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), _USER_ID, ticker, quantity, current_price, now),
                )

        else:  # sell
            cursor = await db.execute(
                "SELECT quantity FROM positions WHERE user_id = ? AND ticker = ?",
                (_USER_ID, ticker),
            )
            existing = await cursor.fetchone()
            held = existing["quantity"] if existing else 0.0
            if not existing or held < quantity:
                return ExecuteTradeResponse(
                    success=False,
                    error=f"Insufficient shares: need {quantity}, have {held}",
                )
            await db.execute(
                "UPDATE users_profile SET cash_balance = cash_balance + ? WHERE id = ?",
                (trade_cost, _USER_ID),
            )
            new_qty = held - quantity
            if new_qty == 0:
                await db.execute(
                    "DELETE FROM positions WHERE user_id = ? AND ticker = ?",
                    (_USER_ID, ticker),
                )
            else:
                await db.execute(
                    "UPDATE positions SET quantity = ?, updated_at = ?"
                    " WHERE user_id = ? AND ticker = ?",
                    (new_qty, now, _USER_ID, ticker),
                )

        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), _USER_ID, ticker, side, quantity, current_price, now),
        )

        await _record_snapshot(db, _USER_ID, now)
        await db.commit()

        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = ?", (_USER_ID,)
        )
        row = await cursor.fetchone()
        new_balance = row["cash_balance"]

        return ExecuteTradeResponse(
            success=True,
            trade=TradeResponse(
                ticker=ticker,
                side=side,
                quantity=quantity,
                price=current_price,
                executed_at=now,
            ),
            new_balance=new_balance,
        )
    finally:
        await db.close()


@router.get("/history", response_model=list[PortfolioSnapshot])
async def get_portfolio_history():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT total_value, recorded_at FROM portfolio_snapshots"
            " WHERE user_id = ?"
            " ORDER BY recorded_at ASC"
            " LIMIT 500",
            (_USER_ID,),
        )
        rows = await cursor.fetchall()
        return [
            PortfolioSnapshot(total_value=r["total_value"], recorded_at=r["recorded_at"])
            for r in rows
        ]
    finally:
        await db.close()


async def _record_snapshot(db, user_id: str, now: str) -> None:
    """Insert a portfolio total-value snapshot using an existing db connection."""
    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    )
    row = await cursor.fetchone()
    cash_balance = row["cash_balance"] if row else 0.0

    cursor = await db.execute(
        "SELECT ticker, quantity FROM positions WHERE user_id = ?", (user_id,)
    )
    position_rows = await cursor.fetchall()

    positions_value = sum(
        r["quantity"] * (price_cache.get_price(r["ticker"]) or 0.0)
        for r in position_rows
    )
    total_value = cash_balance + positions_value

    await db.execute(
        "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at)"
        " VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, total_value, now),
    )


async def record_snapshot_standalone(user_id: str = _USER_ID) -> None:
    """Record a portfolio snapshot with its own db connection. Used by background task."""
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await _record_snapshot(db, user_id, now)
        await db.commit()
    finally:
        await db.close()
