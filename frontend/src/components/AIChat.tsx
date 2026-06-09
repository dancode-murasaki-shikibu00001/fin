'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/types'
import { sendChatMessage } from '@/lib/api'

interface AIChatProps {
  onTradeExecuted?: () => void
  onWatchlistChanged?: () => void
}

export default function AIChat({ onTradeExecuted, onWatchlistChanged }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage({ message: text })
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        timestamp: new Date().toISOString(),
        trades: res.trades as ChatMessage['trades'],
        watchlist_changes: res.watchlist_changes,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (res.trades && res.trades.length > 0) {
        onTradeExecuted?.()
      }
      if (res.watchlist_changes && res.watchlist_changes.length > 0) {
        onWatchlistChanged?.()
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">AI Assistant</div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs" style={{ color: '#6e7681' }}>
            Ask me about your portfolio, request analysis, or say &quot;buy 10 AAPL&quot;.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className="max-w-[85%] px-3 py-2 rounded text-xs"
              style={{
                backgroundColor: msg.role === 'user' ? '#209dd7' : '#1e2033',
                color: '#e6edf3',
              }}
            >
              {msg.content}
            </div>
            {msg.trades && msg.trades.length > 0 && (
              <div className="text-xs px-2" style={{ color: '#3fb950' }}>
                ✓ Executed {msg.trades.length} trade(s)
              </div>
            )}
            {msg.watchlist_changes && msg.watchlist_changes.length > 0 && (
              <div className="text-xs px-2" style={{ color: '#209dd7' }}>
                ✓ Updated watchlist
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div
              className="px-3 py-2 rounded text-xs"
              style={{ backgroundColor: '#1e2033', color: '#8b949e' }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2" style={{ borderColor: '#2a2d3e' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask FinAlly..."
          disabled={loading}
          className="flex-1 px-3 py-1.5 text-xs rounded border outline-none"
          style={{
            backgroundColor: '#0d1117',
            borderColor: '#2a2d3e',
            color: '#e6edf3',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 text-xs font-bold rounded"
          style={{ backgroundColor: '#753991', color: '#e6edf3' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
