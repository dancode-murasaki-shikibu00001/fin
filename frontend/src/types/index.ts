export interface Price {
  ticker: string
  price: number
  prev_price: number
  timestamp: string
  change_direction: 'up' | 'down' | 'neutral'
}

export interface Position {
  ticker: string
  quantity: number
  avg_cost: number
  current_price: number
  unrealized_pnl: number
  pnl_percent: number
  market_value: number
  portfolio_weight: number
}

export interface Portfolio {
  positions: Position[]
  cash_balance: number
  total_value: number
  total_unrealized_pnl: number
  total_pnl_percent: number
}

export interface PortfolioSnapshot {
  timestamp: string
  total_value: number
}

export interface Trade {
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  timestamp: string
}

export interface TradeRequest {
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
}

export interface TradeResponse {
  success: boolean
  trade?: Trade
  error?: string
}

export interface WatchlistItem {
  ticker: string
  price: number
  prev_price: number
  change_percent: number
  change_direction: 'up' | 'down' | 'neutral'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  trades?: Trade[]
  watchlist_changes?: WatchlistChange[]
}

export interface WatchlistChange {
  ticker: string
  action: 'add' | 'remove'
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  message: string
  trades?: TradeRequest[]
  watchlist_changes?: WatchlistChange[]
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'
