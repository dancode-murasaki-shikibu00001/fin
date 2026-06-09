'use client'

import type { Position } from '@/types'

interface PortfolioHeatmapProps {
  positions: Position[]
}

export default function PortfolioHeatmap({ positions }: PortfolioHeatmapProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Portfolio Heatmap</div>
      <div className="flex-1 flex items-center justify-center p-2">
        {positions.length === 0 ? (
          <span className="text-xs" style={{ color: '#6e7681' }}>
            No positions
          </span>
        ) : (
          <div className="w-full h-full flex flex-wrap gap-1">
            {positions.map((pos) => (
              <div
                key={pos.ticker}
                className="flex items-center justify-center rounded text-xs font-bold"
                style={{
                  width: `${Math.max(pos.portfolio_weight * 100, 8)}%`,
                  minHeight: '32px',
                  backgroundColor:
                    pos.unrealized_pnl > 0
                      ? `rgba(63,185,80,${Math.min(0.2 + pos.pnl_percent / 20, 0.7)})`
                      : pos.unrealized_pnl < 0
                      ? `rgba(248,81,73,${Math.min(0.2 + Math.abs(pos.pnl_percent) / 20, 0.7)})`
                      : 'rgba(139,148,158,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e6edf3',
                }}
              >
                {pos.ticker}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
