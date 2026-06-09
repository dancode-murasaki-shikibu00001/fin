'use client'

import { useEffect, useRef, useState } from 'react'
import type { Price, ConnectionStatus } from '@/types'

export interface PriceMap {
  [ticker: string]: Price
}

export function usePriceStream() {
  const [prices, setPrices] = useState<PriceMap>({})
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      if (esRef.current) {
        esRef.current.close()
      }

      const es = new EventSource('/api/stream/prices')
      esRef.current = es

      es.onopen = () => {
        setStatus('connected')
      }

      es.onmessage = (event) => {
        try {
          const price = JSON.parse(event.data) as Price
          setPrices((prev) => ({ ...prev, [price.ticker]: price }))
        } catch {
          // ignore malformed events
        }
      }

      es.onerror = () => {
        setStatus('reconnecting')
        es.close()
        esRef.current = null
        // EventSource handles auto-reconnect; we track status only
        setTimeout(() => {
          if (esRef.current === null) {
            connect()
          }
        }, 3000)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [])

  return { prices, status }
}
