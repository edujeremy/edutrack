import type { Metadata, Viewport } from 'next'
import { ToasterProvider } from '@/components/ui/ToasterProvider'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'GCY EDU - 학원 관리 시스템',
  description: '학원 관리를 위한 통합 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        {children}
        <ToasterProvider />
      </body>
    </html>
  )
}
