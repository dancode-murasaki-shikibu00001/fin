'use client'

import type { Position } from '@/types'

interface PositionsTableProps {
  positions: Position[]
}

export default function PositionsTable({ positions }: PositionsTableProps) {
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
              {positions.map((pos) => (
                <tr
                  key={pos.ticker}
                  style={{ borderBottom: '1px solid #2a2d3e', color: '#e6edf3' }}
                >
                  <td className="px-3 py-1.5 font-bold">{pos.ticker}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{pos.quantity}</td>
                  <td className="px-3 py-1.5 text-right font-mono">${pos.avg_cost.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">${pos.current_price.toFixed(2)}</td>
                  <td
                    className="px-3 py-1.5 text-right font-mono"
                    style={{ color: pos.unrealized_pnl >= 0 ? '#3fb950' : '#f85149' }}
                  >
                    {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                  </td>
                  <td
                    className="px-3 py-1.5 text-right font-mono"
                    style={{ color: pos.pnl_percent >= 0 ? '#3fb950' : '#f85149' }}
                  >
                    {pos.pnl_percent >= 0 ? '+' : ''}{pos.pnl_percent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
