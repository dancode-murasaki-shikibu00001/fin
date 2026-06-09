import type {
  Portfolio,
  PortfolioSnapshot,
  TradeRequest,
  TradeResponse,
  WatchlistItem,
  ChatRequest,
  ChatResponse,
} from '@/types'

const BASE = '/api'

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function getPortfolio(): Promise<Portfolio> {
  return fetchJSON<Portfolio>('/portfolio')
}

export async function executeTrade(req: TradeRequest): Promise<TradeResponse> {
  return fetchJSON<TradeResponse>('/portfolio/trade', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getPortfolioHistory(): Promise<PortfolioSnapshot[]> {
  return fetchJSON<PortfolioSnapshot[]>('/portfolio/history')
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  return fetchJSON<WatchlistItem[]>('/watchlist')
}

export async function addToWatchlist(ticker: string): Promise<void> {
  return fetchJSON<void>('/watchlist', {
    method: 'POST',
    body: JSON.stringify({ ticker }),
  })
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  return fetchJSON<void>(`/watchlist/${encodeURIComponent(ticker)}`, {
    method: 'DELETE',
  })
}

export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  return fetchJSON<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function checkHealth(): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>('/health')
}
