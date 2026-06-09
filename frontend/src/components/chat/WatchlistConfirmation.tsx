interface WatchlistChange {
  ticker: string
  action: string
}

interface WatchlistConfirmationProps {
  changes: WatchlistChange[]
}

export default function WatchlistConfirmation({ changes }: WatchlistConfirmationProps) {
  if (!changes.length) return null

  return (
    <div className="mt-2 flex flex-col gap-1">
      {changes.map((change, i) => (
        <div
          key={i}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(32,157,215,0.15)',
            color: '#209dd7',
            border: '1px solid rgba(32,157,215,0.3)',
          }}
        >
          {change.action === 'add' ? 'Added' : 'Removed'} {change.ticker.toUpperCase()}{' '}
          {change.action === 'add' ? 'to' : 'from'} watchlist
        </div>
      ))}
    </div>
  )
}
