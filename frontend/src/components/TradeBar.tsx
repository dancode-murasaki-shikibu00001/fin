'use client'

import { useEffect, useState } from 'react'
import type { TradeRequest } from '@/types'

interface TradeBarProps {
  defaultTicker?: string
  onTrade: (req: TradeRequest) => Promise<void>
}

export default function TradeBar({ defaultTicker = '', onTrade }: TradeBarProps) {
  const [ticker, setTicker] = useState(defaultTicker)
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  async function submit(side: 'buy' | 'sell') {
    const qty = parseInt(quantity, 10)
    if (!ticker || isNaN(qty) || qty <= 0) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await onTrade({ ticker: ticker.toUpperCase(), side, quantity: qty })
      setSuccess(`${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${ticker.toUpperCase()}`)
      setQuantity('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">Trade</div>
      <div className="p-3 flex flex-col gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          maxLength={10}
          className="w-full px-2 py-1.5 text-xs font-mono rounded border outline-none"
          style={{
            backgroundColor: '#0d1117',
            borderColor: '#2a2d3e',
            color: '#e6edf3',
          }}
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          min={1}
          className="w-full px-2 py-1.5 text-xs font-mono rounded border outline-none"
          style={{
            backgroundColor: '#0d1117',
            borderColor: '#2a2d3e',
            color: '#e6edf3',
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => submit('buy')}
            disabled={loading}
            className="flex-1 py-1.5 text-xs font-bold rounded uppercase tracking-wider"
            style={{ backgroundColor: '#3fb950', color: '#0d1117', opacity: loading ? 0.6 : 1 }}
          >
            Buy
          </button>
          <button
            onClick={() => submit('sell')}
            disabled={loading}
            className="flex-1 py-1.5 text-xs font-bold rounded uppercase tracking-wider"
            style={{ backgroundColor: '#f85149', color: '#e6edf3', opacity: loading ? 0.6 : 1 }}
          >
            Sell
          </button>
        </div>
        {success && (
          <p className="text-xs" style={{ color: '#3fb950' }}>
            ✓ {success}
          </p>
        )}
        {error && (
          <p className="text-xs" style={{ color: '#f85149' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
