import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '云粥的博客',
  description: '不知道写点什么、但还是希望能有点产出。日更！！！',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

