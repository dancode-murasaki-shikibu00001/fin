"""Pydantic models for all API request/response schemas."""

from pydantic import BaseModel


# --- Health ---

class HealthResponse(BaseModel):
    status: str


# --- Watchlist ---

class AddTickerRequest(BaseModel):
    ticker: str


class WatchlistItem(BaseModel):
    ticker: str
    price: float | None = None
    previous_price: float | None = None
    change_percent: float | None = None


# --- Portfolio ---

class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str  # "buy" or "sell"


class TradeResponse(BaseModel):
    ticker: str
    side: str
    quantity: float
    price: float
    executed_at: str


class Position(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    current_price: float
    unrealized_pnl: float
    pnl_percent: float
    market_value: float
    portfolio_weight: float


class PortfolioResponse(BaseModel):
    cash_balance: float
    total_value: float
    total_unrealized_pnl: float
    total_pnl_percent: float
    positions: list[Position]


class ExecuteTradeResponse(BaseModel):
    success: bool
    trade: TradeResponse | None = None
    new_balance: float | None = None
    error: str | None = None


class PortfolioSnapshot(BaseModel):
    total_value: float
    timestamp: str  # DB column is recorded_at; renamed to match frontend type


# --- Chat ---

class TradeAction(BaseModel):
    ticker: str
    side: str
    quantity: float


class WatchlistChange(BaseModel):
    ticker: str
    action: str  # "add" or "remove"


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: str
    trades: list[TradeAction] = []
    watchlist_changes: list[WatchlistChange] = []
    executed_trades: list[TradeAction] = []
    errors: list[str] = []
