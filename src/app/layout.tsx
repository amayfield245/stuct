import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'System Agent',
  description: 'Knowledge graph extraction and exploration system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-white text-black">
          {children}
        </div>
      </body>
    </html>
  )
}