'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage, { type Message } from './ChatMessage'

interface ChatApiResponse {
  message: string
  trades?: { ticker: string; side: string; quantity: number }[]
  watchlist_changes?: { ticker: string; action: string }[]
  executed_trades?: { ticker: string; side: string; quantity: number }[]
  errors?: string[]
}

interface ChatPanelProps {
  onTradeExecuted?: () => void
  onWatchlistChanged?: () => void
}

async function postChat(text: string): Promise<ChatApiResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export default function ChatPanel({ onTradeExecuted, onWatchlistChanged }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await postChat(text)
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        timestamp: new Date().toISOString(),
        // prefer executed_trades (successfully completed) over trades (all requested)
        executedTrades: res.executed_trades ?? res.trades,
        watchlistChanges: res.watchlist_changes,
        errors: res.errors,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if ((res.executed_trades?.length ?? 0) > 0 || (res.trades?.length ?? 0) > 0) {
        onTradeExecuted?.()
      }
      if ((res.watchlist_changes?.length ?? 0) > 0) {
        onWatchlistChanged?.()
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Error: Failed to get response. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">FinAlly AI</div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-center" style={{ color: '#6e7681' }}>
            Ask me about your portfolio, request analysis, or say &quot;buy 10 AAPL&quot;.
          </p>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {loading && (
          <div className="flex items-start">
            <div
              className="px-3 py-2 rounded text-xs"
              style={{ backgroundColor: '#1e2033', color: '#8b949e' }}
            >
              FinAlly is thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2" style={{ borderColor: '#2a2d3e' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask FinAlly..."
          disabled={loading}
          rows={1}
          className="flex-1 px-3 py-1.5 text-xs rounded border outline-none resize-none"
          style={{
            backgroundColor: '#0d1117',
            borderColor: '#2a2d3e',
            color: '#e6edf3',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 px-3 py-1.5 text-xs font-bold rounded disabled:opacity-40"
          style={{ backgroundColor: '#753991', color: '#e6edf3' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
