import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '행사 참석 관리 서비스',
  description: '소규모 오프라인 행사 참석 관리',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

