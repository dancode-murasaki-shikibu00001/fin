'use client'

import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePriceStream } from '@/hooks/usePriceStream'

interface MainChartProps {
  ticker: string | null
}

interface PricePoint {
  time: string
  price: number
}

export default function MainChart({ ticker }: MainChartProps) {
  const { prices } = usePriceStream()
  const historyRef = useRef<Map<string, PricePoint[]>>(new Map())
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (!ticker) return
    const price = prices[ticker]
    if (!price) return
    const history = historyRef.current.get(ticker) ?? []
    const last = history[history.length - 1]
    if (last && last.price === price.price) return
    history.push({
      time: new Date(price.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: price.price,
    })
    if (history.length > 300) history.shift()
    historyRef.current.set(ticker, history)
    forceRender((n) => n + 1)
  }, [prices, ticker])

  const data = ticker ? (historyRef.current.get(ticker) ?? []) : []
  const currentPrice = ticker ? prices[ticker]?.price : null
  const firstPrice = data[0]?.price
  const isUp = currentPrice != null && firstPrice != null && currentPrice >= firstPrice
  const lineColor = isUp ? '#16a34a' : '#dc2626'

  const priceMin = data.length ? Math.min(...data.map((d) => d.price)) * 0.9995 : 0
  const priceMax = data.length ? Math.max(...data.map((d) => d.price)) * 1.0005 : 100

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>{ticker ? `${ticker} — Price Chart` : 'Chart — Select a Ticker'}</span>
        {currentPrice != null && (
          <span style={{ color: lineColor, fontVariantNumeric: 'tabular-nums' }}>
            ${currentPrice.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 p-2">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: '#6e7681', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[priceMin, priceMax]}
                tick={{ fill: '#6e7681', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #30363d', fontSize: 11 }}
                labelStyle={{ color: '#6e7681' }}
                itemStyle={{ color: lineColor }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color: '#6e7681' }}>
            <span className="text-xs">
              {ticker ? 'Accumulating price data…' : 'Click a ticker in the watchlist to view its chart'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
