'use client'

import type { ConnectionStatus } from '@/types'

interface HeaderProps {
  totalValue: number
  cashBalance: number
  connectionStatus: ConnectionStatus
}

const statusColors: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-red-500',
}

const statusLabels: Record<ConnectionStatus, string> = {
  connected: 'LIVE',
  reconnecting: 'RECONNECTING',
  disconnected: 'OFFLINE',
}

export default function Header({ totalValue, cashBalance, connectionStatus }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{
        backgroundColor: '#1a1a2e',
        borderColor: '#2a2d3e',
        height: '48px',
      }}
    >
      <div className="flex items-center gap-6">
        <span
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: '#ecad0a' }}
        >
          FinAlly
        </span>
        <div className="flex items-center gap-1">
          <span style={{ color: '#8b949e' }} className="text-xs uppercase tracking-wider">
            Portfolio
          </span>
          <span
            className="text-sm font-mono font-bold ml-2"
            style={{ color: '#e6edf3' }}
          >
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ color: '#8b949e' }} className="text-xs uppercase tracking-wider">
            Cash
          </span>
          <span
            className="text-sm font-mono ml-2"
            style={{ color: '#e6edf3' }}
          >
            ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]}`}
          style={{ boxShadow: connectionStatus === 'connected' ? '0 0 4px #3fb950' : undefined }}
        />
        <span className="text-xs" style={{ color: '#8b949e' }}>
          {statusLabels[connectionStatus]}
        </span>
      </div>
    </header>
  )
}
