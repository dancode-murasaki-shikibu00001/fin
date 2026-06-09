'use client'

import { Treemap, ResponsiveContainer } from 'recharts'
import type { Position } from '@/types'

interface PortfolioHeatmapProps {
  positions: Position[]
}

interface TreemapNode {
  name: string
  size: number
  pnl_pct: number
  fill: string
}

function pnlColor(pnl_pct: number): string {
  if (pnl_pct > 0) {
    const intensity = Math.min(0.2 + pnl_pct / 20, 0.85)
    return `rgba(63,185,80,${intensity.toFixed(2)})`
  }
  if (pnl_pct < 0) {
    const intensity = Math.min(0.2 + Math.abs(pnl_pct) / 20, 0.85)
    return `rgba(248,81,73,${intensity.toFixed(2)})`
  }
  return 'rgba(139,148,158,0.25)'
}

interface ContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  pnl_pct?: number
}

function HeatmapCell({ x = 0, y = 0, width = 0, height = 0, name, pnl_pct = 0 }: ContentProps) {
  if (width < 10 || height < 10) return null
  const showPct = height >= 28 && width >= 36
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={height - 2}
        style={{ fill: pnlColor(pnl_pct), stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
        rx={2}
      />
      {width >= 24 && height >= 16 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showPct ? -6 : 4)}
          textAnchor="middle"
          fill="#e6edf3"
          fontSize={Math.min(11, Math.floor(width / 5))}
          fontWeight="bold"
        >
          {name}
        </text>
      )}
      {showPct && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          fill="#e6edf3"
          fontSize={Math.min(10, Math.floor(width / 6))}
          opacity={0.85}
        >
          {pnl_pct >= 0 ? '+' : ''}{pnl_pct.toFixed(2)}%
        </text>
      )}
    </g>
  )
}

export default function PortfolioHeatmap({ positions }: PortfolioHeatmapProps) {
  if (positions.length === 0) {
    return (
      <div className="panel flex flex-col h-full">
        <div className="panel-header">Portfolio Heatmap</div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs" style={{ color: '#6e7681' }}>No positions</span>
        </div>
      </div>
    )
  }

  const data: TreemapNode[] = positions.map((pos) => ({
    name: pos.ticker,
    size: Math.max(pos.portfolio_weight * 100, 1),
    pnl_pct: pos.pnl_percent,
    fill: pnlColor(pos.pnl_percent),
  }))

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">Portfolio Heatmap</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            content={<HeatmapCell />}
            isAnimationActive={false}
          />
        </ResponsiveContainer>
      </div>
    </div>
  )
}
