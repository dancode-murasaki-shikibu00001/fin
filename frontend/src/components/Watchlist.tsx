'use client'

import type { WatchlistItem } from '@/types'

interface WatchlistProps {
  items: WatchlistItem[]
  selectedTicker: string | null
  onSelectTicker: (ticker: string) => void
}

export default function Watchlist({ items, selectedTicker, onSelectTicker }: WatchlistProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Watchlist</div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-3 text-xs" style={{ color: '#6e7681' }}>
            No tickers in watchlist
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.ticker}
              onClick={() => onSelectTicker(item.ticker)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer border-b"
              style={{
                borderColor: '#2a2d3e',
                backgroundColor: selectedTicker === item.ticker ? '#1e2033' : 'transparent',
              }}
            >
              <span className="font-bold text-xs" style={{ color: '#e6edf3' }}>
                {item.ticker}
              </span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-mono" style={{ color: '#e6edf3' }}>
                  ${item.price.toFixed(2)}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: item.change_direction === 'up'
                      ? '#3fb950'
                      : item.change_direction === 'down'
                      ? '#f85149'
                      : '#8b949e',
                  }}
                >
                  {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
