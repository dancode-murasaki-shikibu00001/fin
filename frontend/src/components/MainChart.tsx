'use client'

interface MainChartProps {
  ticker: string | null
}

export default function MainChart({ ticker }: MainChartProps) {
  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        {ticker ? `${ticker} — Price Chart` : 'Chart — Select a Ticker'}
      </div>
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: '#6e7681' }}
      >
        {ticker ? (
          <span className="text-xs">Chart for {ticker} (Coming Soon)</span>
        ) : (
          <span className="text-xs">Click a ticker in the watchlist to view its chart</span>
        )}
      </div>
    </div>
  )
}
