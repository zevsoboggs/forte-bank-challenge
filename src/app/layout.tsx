import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'
import { Suspense } from 'react'
import NavigationLoader from '@/components/NavigationLoader'
import PageLoader from '@/components/PageLoader'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Forte.AI - GREKdev System',
  description: 'Intelligent GREKdev system powered by ML and AI',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={<PageLoader />}>
            <NavigationLoader />
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
