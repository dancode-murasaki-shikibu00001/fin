'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PortfolioSnapshot } from '@/types'

interface PnLChartProps {
  history: PortfolioSnapshot[]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDollar(val: number): string {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function PnLChart({ history }: PnLChartProps) {
  if (history.length === 0) {
    return (
      <div className="panel flex flex-col h-full">
        <div className="panel-header">P&amp;L Over Time</div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs" style={{ color: '#6e7681' }}>No history yet</span>
        </div>
      </div>
    )
  }

  const data = history.map((snap) => ({
    time: formatTime(snap.timestamp),
    value: snap.total_value,
  }))

  const values = history.map((s) => s.total_value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const padding = Math.max((maxVal - minVal) * 0.1, 50)

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">P&amp;L Over Time</div>
      <div className="flex-1 min-h-0 px-1 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fill: '#6e7681', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fill: '#6e7681', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatDollar}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #2a2d3e',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#e6edf3',
              }}
              formatter={(val: number) => [formatDollar(val), 'Portfolio']}
              labelStyle={{ color: '#8b949e' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#209dd7"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#209dd7' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
