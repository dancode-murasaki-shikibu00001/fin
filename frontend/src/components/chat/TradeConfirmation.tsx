interface TradeResult {
  ticker: string
  side: string
  quantity: number
}

interface TradeConfirmationProps {
  trades?: TradeResult[]
  errors?: string[]
}

export default function TradeConfirmation({ trades, errors }: TradeConfirmationProps) {
  const hasTrades = trades && trades.length > 0
  const hasErrors = errors && errors.length > 0

  if (!hasTrades && !hasErrors) return null

  return (
    <div className="mt-2 flex flex-col gap-1">
      {trades?.map((trade, i) => (
        <div
          key={i}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: trade.side === 'buy' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
            color: trade.side === 'buy' ? '#3fb950' : '#f85149',
            border: `1px solid ${trade.side === 'buy' ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
          }}
        >
          Executed: {trade.side.toUpperCase()} {trade.quantity} {trade.ticker.toUpperCase()}
        </div>
      ))}
      {errors?.map((error, i) => (
        <div
          key={i}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(248,81,73,0.15)',
            color: '#f85149',
            border: '1px solid rgba(248,81,73,0.3)',
          }}
        >
          Failed: {error}
        </div>
      ))}
    </div>
  )
}
