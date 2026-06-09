import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinAlly — AI Trading Workstation',
  description: 'AI-powered trading workstation with live market data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: '#0d1117', color: '#e6edf3', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
