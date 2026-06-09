'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import WatchlistPanel from '@/components/market/WatchlistPanel'
import TradeBar from '@/components/TradeBar'
import MainChart from '@/components/market/MainChart'
import PortfolioHeatmap from '@/components/PortfolioHeatmap'
import PnLChart from '@/components/PnLChart'
import PositionsTable from '@/components/PositionsTable'
import AIChat from '@/components/AIChat'
import { usePriceStream } from '@/hooks/usePriceStream'
import {
  getPortfolio,
  getWatchlist,
  getPortfolioHistory,
  executeTrade,
} from '@/lib/api'
import type {
  Portfolio,
  WatchlistItem,
  PortfolioSnapshot,
  TradeRequest,
} from '@/types'

const POLL_INTERVAL_MS = 5000

export default function TradingTerminal() {
  const { prices, status: connectionStatus } = usePriceStream()

  const [portfolio, setPortfolio] = useState<Portfolio>({
    positions: [],
    cash_balance: 10000,
    total_value: 10000,
    total_unrealized_pnl: 0,
    total_pnl_percent: 0,
  })
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [history, setHistory] = useState<PortfolioSnapshot[]>([])
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const refreshPortfolio = useCallback(async () => {
    try {
      const data = await getPortfolio()
      setPortfolio(data)
    } catch {
      // backend may not be running during dev
    }
  }, [])

  const refreshWatchlist = useCallback(async () => {
    try {
      const data = await getWatchlist()
      setWatchlist(data)
    } catch {
      // backend may not be running during dev
    }
  }, [])

  const refreshHistory = useCallback(async () => {
    try {
      const data = await getPortfolioHistory()
      setHistory(data)
    } catch {
      // backend may not be running during dev
    }
  }, [])

  useEffect(() => {
    refreshPortfolio()
    refreshWatchlist()
    refreshHistory()

    const interval = setInterval(() => {
      refreshPortfolio()
      refreshWatchlist()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [refreshPortfolio, refreshWatchlist, refreshHistory])

  async function handleTrade(req: TradeRequest) {
    const res = await executeTrade(req)
    if (!res.success) throw new Error(res.error ?? 'Trade failed')
    await refreshPortfolio()
    await refreshHistory()
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', backgroundColor: '#0d1117' }}>
      <Header
        totalValue={portfolio.total_value}
        cashBalance={portfolio.cash_balance}
        connectionStatus={connectionStatus}
      />

      {/* Main content grid */}
      <div
        className="flex-1 grid gap-1 p-1 overflow-hidden"
        style={{
          gridTemplateColumns: '220px 1fr 300px',
          gridTemplateRows: '1fr',
          minHeight: 0,
        }}
      >
        {/* Left panel: Watchlist + Trade bar */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className="flex-1 overflow-hidden min-h-0">
            <WatchlistPanel
              selectedTicker={selectedTicker}
              onSelectTicker={setSelectedTicker}
            />
          </div>
          <div className="flex-shrink-0">
            <TradeBar
              defaultTicker={selectedTicker ?? ''}
              onTrade={handleTrade}
            />
          </div>
        </div>

        {/* Center: Chart + Heatmap + P&L */}
        <div
          className="grid gap-1 overflow-hidden"
          style={{ gridTemplateRows: '2fr 1fr 1fr', minHeight: 0 }}
        >
          <div className="overflow-hidden min-h-0">
            <MainChart ticker={selectedTicker} />
          </div>
          <div className="overflow-hidden min-h-0">
            <PortfolioHeatmap positions={portfolio.positions} />
          </div>
          <div className="overflow-hidden min-h-0">
            <PnLChart history={history} />
          </div>
        </div>

        {/* Right panel: Positions + AI Chat */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <div style={{ flex: '0 0 40%', minHeight: 0, overflow: 'hidden' }}>
            <PositionsTable positions={portfolio.positions} prices={prices} />
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <AIChat
              onTradeExecuted={refreshPortfolio}
              onWatchlistChanged={refreshWatchlist}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
