'use client'

import { useState } from 'react'

interface AddTickerProps {
  onAdd: (ticker: string) => Promise<void>
}

export default function AddTicker({ onAdd }: AddTickerProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    const ticker = value.trim().toUpperCase()
    if (!ticker) return
    setLoading(true)
    try {
      await onAdd(ticker)
      setValue('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !loading && handleAdd()}
        placeholder="Add ticker..."
        disabled={loading}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '4px 8px',
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '4px',
          color: '#e6edf3',
          fontSize: '11px',
          outline: 'none',
          opacity: loading ? 0.6 : 1,
        }}
      />
      <button
        onClick={handleAdd}
        disabled={loading}
        style={{
          padding: '4px 10px',
          background: '#753991',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        +
      </button>
    </div>
  )
}
