'use client'

import type { Position } from '@/types'
import type { PriceMap } from '@/hooks/usePriceStream'

interface PositionsTableProps {
  positions: Position[]
  prices?: PriceMap
}

export default function PositionsTable({ positions, prices = {} }: PositionsTableProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Positions</div>
      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="p-3 text-xs" style={{ color: '#6e7681' }}>
            No open positions
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: '#8b949e', borderBottom: '1px solid #2a2d3e' }}>
                <th className="px-3 py-2 text-left font-medium">Ticker</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Avg Cost</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const livePrice = prices[pos.ticker]?.price ?? pos.current_price
                const liveUnrealizedPnl = (livePrice - pos.avg_cost) * pos.quantity
                const livePnlPct = pos.avg_cost > 0
                  ? ((livePrice - pos.avg_cost) / pos.avg_cost) * 100
                  : 0
                return (
                  <tr
                    key={pos.ticker}
                    style={{ borderBottom: '1px solid #2a2d3e', color: '#e6edf3' }}
                  >
                    <td className="px-3 py-1.5 font-bold">{pos.ticker}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{pos.quantity}</td>
                    <td className="px-3 py-1.5 text-right font-mono">${pos.avg_cost.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">${livePrice.toFixed(2)}</td>
                    <td
                      className="px-3 py-1.5 text-right font-mono"
                      style={{ color: liveUnrealizedPnl >= 0 ? '#3fb950' : '#f85149' }}
                    >
                      {liveUnrealizedPnl >= 0 ? '+' : ''}${liveUnrealizedPnl.toFixed(2)}
                    </td>
                    <td
                      className="px-3 py-1.5 text-right font-mono"
                      style={{ color: livePnlPct >= 0 ? '#3fb950' : '#f85149' }}
                    >
                      {livePnlPct >= 0 ? '+' : ''}{livePnlPct.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
