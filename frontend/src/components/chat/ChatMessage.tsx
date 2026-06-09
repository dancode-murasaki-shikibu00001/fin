import TradeConfirmation from './TradeConfirmation'
import WatchlistConfirmation from './WatchlistConfirmation'

export interface TradeResult {
  ticker: string
  side: string
  quantity: number
}

export interface WatchlistChange {
  ticker: string
  action: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  executedTrades?: TradeResult[]
  watchlistChanges?: WatchlistChange[]
  errors?: string[]
}

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && (
        <span className="text-xs font-semibold" style={{ color: '#8b949e' }}>
          FinAlly
        </span>
      )}
      <div
        className="max-w-[85%] rounded px-3 py-2 text-xs"
        style={{
          backgroundColor: isUser ? '#209dd7' : '#1e2033',
          color: '#e6edf3',
        }}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {!isUser && (
          <>
            <TradeConfirmation
              trades={message.executedTrades}
              errors={message.errors}
            />
            {message.watchlistChanges && message.watchlistChanges.length > 0 && (
              <WatchlistConfirmation changes={message.watchlistChanges} />
            )}
          </>
        )}
      </div>
      <span className="text-xs" style={{ color: '#6e7681' }}>
        {formattedTime}
      </span>
    </div>
  )
}
