'use client'

import type { PortfolioSnapshot } from '@/types'

interface PnLChartProps {
  history: PortfolioSnapshot[]
}

export default function PnLChart({ history }: PnLChartProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">P&amp;L Over Time</div>
      <div className="flex-1 flex items-center justify-center" style={{ color: '#6e7681' }}>
        {history.length === 0 ? (
          <span className="text-xs">No history yet</span>
        ) : (
          <span className="text-xs">{history.length} snapshots (chart coming soon)</span>
        )}
      </div>
    </div>
  )
}
