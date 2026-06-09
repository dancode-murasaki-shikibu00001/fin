'use client'

import { useState, useEffect, useRef } from 'react'
import { usePriceStream } from '@/hooks/usePriceStream'
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '@/lib/api'
import Sparkline from './Sparkline'
import AddTicker from './AddTicker'
import styles from './flash.module.css'

interface WatchlistPanelProps {
  selectedTicker: string | null
  onSelectTicker: (ticker: string) => void
}

export default function WatchlistPanel({ selectedTicker, onSelectTicker }: WatchlistPanelProps) {
  const { prices } = usePriceStream()
  const [tickers, setTickers] = useState<string[]>([])

  const priceHistoryRef = useRef<Map<string, number[]>>(new Map())
  const [, forceRender] = useState(0)
  const firstPriceRef = useRef<Map<string, number>>(new Map())
  const prevPricesRef = useRef<Map<string, number>>(new Map())

  const [flashState, setFlashState] = useState<Map<string, 'up' | 'down'>>(new Map())
  const flashTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    getWatchlist()
      .then((items) => setTickers(items.map((i) => i.ticker)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!prices || Object.keys(prices).length === 0) return

    const toFlash: Array<[string, 'up' | 'down']> = []
    let changed = false

    for (const [ticker, priceData] of Object.entries(prices)) {
      const newPrice = priceData.price
      const prevPrice = prevPricesRef.current.get(ticker)

      if (prevPrice === undefined) {
        firstPriceRef.current.set(ticker, newPrice)
        priceHistoryRef.current.set(ticker, [newPrice])
        changed = true
      } else if (prevPrice !== newPrice) {
        const prev = priceHistoryRef.current.get(ticker) ?? []
        priceHistoryRef.current.set(ticker, [...prev, newPrice])
        changed = true
        if (priceData.change_direction !== 'neutral') {
          toFlash.push([ticker, priceData.change_direction as 'up' | 'down'])
        }
      }
      prevPricesRef.current.set(ticker, newPrice)
    }

    if (changed) forceRender((v) => v + 1)

    if (toFlash.length > 0) {
      setFlashState((prev) => {
        const next = new Map(prev)
        toFlash.forEach(([t, dir]) => {
          const existing = flashTimersRef.current.get(t)
          if (existing) clearTimeout(existing)
          next.set(t, dir)
        })
        return next
      })
      toFlash.forEach(([ticker]) => {
        const timer = setTimeout(() => {
          setFlashState((prev) => {
            const next = new Map(prev)
            next.delete(ticker)
            return next
          })
        }, 500)
        flashTimersRef.current.set(ticker, timer)
      })
    }
  }, [prices])

  const handleAdd = async (ticker: string) => {
    await addToWatchlist(ticker)
    setTickers((prev) => (prev.includes(ticker) ? prev : [...prev, ticker]))
  }

  const handleRemove = async (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await removeFromWatchlist(ticker)
    setTickers((prev) => prev.filter((t) => t !== ticker))
    if (selectedTicker === ticker) onSelectTicker('')
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Watchlist</div>
      <div className="flex-1 overflow-y-auto">
        {tickers.length === 0 ? (
          <div style={{ padding: '12px', fontSize: 11, color: '#6e7681' }}>No tickers in watchlist</div>
        ) : (
          tickers.map((ticker) => {
            const live = prices[ticker]
            const firstPrice = firstPriceRef.current.get(ticker)
            const currentPrice = live?.price
            const history = priceHistoryRef.current.get(ticker) ?? []
            const flash = flashState.get(ticker)

            const changePercent =
              firstPrice != null && currentPrice != null
                ? ((currentPrice - firstPrice) / firstPrice) * 100
                : 0

            return (
              <div
                key={ticker}
                onClick={() => onSelectTicker(ticker)}
                className={flash === 'up' ? styles.flashGreen : flash === 'down' ? styles.flashRed : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #2a2d3e',
                  backgroundColor: selectedTicker === ticker ? '#1e2033' : 'transparent',
                  transition: 'background-color 500ms ease-out',
                }}
              >
                <div style={{ minWidth: 44 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#e6edf3' }}>{ticker}</div>
                  <div style={{ fontSize: 10, color: changePercent >= 0 ? '#3fb950' : '#f85149' }}>
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 4px' }}>
                  <Sparkline data={history} width={60} height={22} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#e6edf3' }}>
                    {currentPrice != null ? `$${currentPrice.toFixed(2)}` : '—'}
                  </span>
                  <button
                    onClick={(e) => handleRemove(ticker, e)}
                    title={`Remove ${ticker}`}
                    style={{
                      fontSize: 10,
                      color: '#6e7681',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
      <div style={{ padding: 8, borderTop: '1px solid #2a2d3e' }}>
        <AddTicker onAdd={handleAdd} />
      </div>
    </div>
  )
}
