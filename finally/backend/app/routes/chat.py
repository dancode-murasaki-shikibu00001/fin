"""LLM chat: LiteLLM/OpenRouter integration, structured outputs, auto-execution."""

import json
import logging
import os
import uuid
from datetime import datetime, timezone

import litellm
from fastapi import APIRouter
from pydantic import BaseModel

from app import price_cache
from app.db.init import get_db
from app.models import ChatRequest, ChatResponse, TradeAction, WatchlistChange

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

_USER_ID = "default"
_MODEL = "openrouter/openai/gpt-oss-120b"
_SYSTEM_PROMPT_TEMPLATE = (
    "You are FinAlly, an AI trading assistant. You help users analyze their portfolio, "
    "suggest trades, and execute trades on their behalf. Always respond with valid JSON "
    "matching the schema. Be concise and data-driven. Current portfolio context: {context}"
)
_MOCK_RESPONSE = {
    "message": "Mock response: your portfolio looks good. AAPL is up today.",
    "trades": [],
    "watchlist_changes": [],
}


class _LLMOutput(BaseModel):
    message: str
    trades: list[TradeAction] = []
    watchlist_changes: list[WatchlistChange] = []


async def _load_context(db) -> dict:
    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (_USER_ID,)
    )
    row = await cursor.fetchone()
    cash_balance = row["cash_balance"] if row else 0.0

    cursor = await db.execute(
        "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ?", (_USER_ID,)
    )
    pos_rows = await cursor.fetchall()
    positions = []
    total_pos_value = 0.0
    for r in pos_rows:
        ticker = r["ticker"]
        qty = r["quantity"]
        avg_cost = r["avg_cost"]
        current = price_cache.get_price(ticker) or avg_cost
        pnl = (current - avg_cost) * qty
        total_pos_value += qty * current
        positions.append(
            {
                "ticker": ticker,
                "quantity": qty,
                "avg_cost": round(avg_cost, 2),
                "current_price": round(current, 2),
                "unrealized_pnl": round(pnl, 2),
            }
        )

    cursor = await db.execute(
        "SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY added_at", (_USER_ID,)
    )
    wl_rows = await cursor.fetchall()
    watchlist = []
    for r in wl_rows:
        ticker = r["ticker"]
        current = price_cache.get_price(ticker)
        watchlist.append({"ticker": ticker, "current_price": current})

    return {
        "cash_balance": round(cash_balance, 2),
        "total_value": round(cash_balance + total_pos_value, 2),
        "positions": positions,
        "watchlist": watchlist,
    }


async def _load_history(db) -> list[dict]:
    cursor = await db.execute(
        "SELECT role, content FROM chat_messages WHERE user_id = ?"
        " ORDER BY created_at DESC LIMIT 20",
        (_USER_ID,),
    )
    rows = await cursor.fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def _do_trade(db, trade: TradeAction) -> tuple[bool, str | None]:
    ticker = trade.ticker.upper()
    side = trade.side
    quantity = trade.quantity

    if side not in ("buy", "sell"):
        return False, f"invalid side '{side}' for {ticker}"
    if quantity <= 0:
        return False, f"invalid quantity {quantity} for {ticker}"

    current_price = price_cache.get_price(ticker)
    if current_price is None:
        return False, f"no price available for {ticker}"

    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (_USER_ID,)
    )
    row = await cursor.fetchone()
    if not row:
        return False, "user profile not found"
    cash_balance = row["cash_balance"]

    trade_cost = quantity * current_price
    now = datetime.now(timezone.utc).isoformat()

    if side == "buy":
        if cash_balance < trade_cost:
            return False, f"insufficient funds: need ${trade_cost:.2f}, have ${cash_balance:.2f}"
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
            new_avg = (old_qty * old_cost + quantity * current_price) / new_qty
            await db.execute(
                "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ?"
                " WHERE user_id = ? AND ticker = ?",
                (new_qty, new_avg, now, _USER_ID, ticker),
            )
        else:
            await db.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), _USER_ID, ticker, quantity, current_price, now),
            )
    else:
        cursor = await db.execute(
            "SELECT quantity FROM positions WHERE user_id = ? AND ticker = ?",
            (_USER_ID, ticker),
        )
        existing = await cursor.fetchone()
        held = existing["quantity"] if existing else 0.0
        if not existing or held < quantity:
            return False, f"insufficient shares: need {quantity}, have {held}"
        await db.execute(
            "UPDATE users_profile SET cash_balance = cash_balance + ? WHERE id = ?",
            (trade_cost, _USER_ID),
        )
        new_qty = held - quantity
        if new_qty == 0:
            await db.execute(
                "DELETE FROM positions WHERE user_id = ? AND ticker = ?", (_USER_ID, ticker)
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
    return True, None


async def _do_watchlist_change(db, change: WatchlistChange) -> tuple[bool, str | None]:
    ticker = change.ticker.upper()
    action = change.action

    if action not in ("add", "remove"):
        return False, f"invalid watchlist action '{action}' for {ticker}"

    now = datetime.now(timezone.utc).isoformat()
    if action == "add":
        try:
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), _USER_ID, ticker, now),
            )
        except Exception as exc:
            if "UNIQUE constraint failed" in str(exc):
                return False, f"{ticker} already in watchlist"
            return False, str(exc)
    else:
        cursor = await db.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?", (_USER_ID, ticker)
        )
        if cursor.rowcount == 0:
            return False, f"{ticker} not in watchlist"

    return True, None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    db = await get_db()
    try:
        context = await _load_context(db)
        history = await _load_history(db)

        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), _USER_ID, "user", request.message, None, now),
        )
        await db.commit()

        if os.environ.get("LLM_MOCK", "").lower() == "true":
            llm_out = _LLMOutput(**_MOCK_RESPONSE)
        else:
            system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
                context=json.dumps(context)
            )
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(history)
            messages.append({"role": "user", "content": request.message})

            resp = await litellm.acompletion(
                model=_MODEL,
                messages=messages,
                response_format=_LLMOutput,
                api_key=os.environ.get("OPENROUTER_API_KEY"),
            )
            raw = resp.choices[0].message.content
            llm_out = _LLMOutput.model_validate_json(raw)

        executed_trades: list[TradeAction] = []
        errors: list[str] = []

        for trade in llm_out.trades:
            ok, err = await _do_trade(db, trade)
            if ok:
                executed_trades.append(trade)
            else:
                errors.append(err or f"trade failed: {trade.ticker}")

        for change in llm_out.watchlist_changes:
            ok, err = await _do_watchlist_change(db, change)
            if not ok:
                errors.append(err or f"watchlist change failed: {change.ticker}")

        await db.commit()

        actions_json = json.dumps(
            {
                "trades": [t.model_dump() for t in llm_out.trades],
                "watchlist_changes": [w.model_dump() for w in llm_out.watchlist_changes],
                "executed_trades": [t.model_dump() for t in executed_trades],
                "errors": errors,
            }
        )
        response_now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                _USER_ID,
                "assistant",
                llm_out.message,
                actions_json,
                response_now,
            ),
        )
        await db.commit()

        return ChatResponse(
            message=llm_out.message,
            trades=llm_out.trades,
            watchlist_changes=llm_out.watchlist_changes,
            executed_trades=executed_trades,
            errors=errors,
        )
    finally:
        await db.close()
