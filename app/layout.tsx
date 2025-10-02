import type React from "react"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import ClientLayout from './client-layout'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'Restaurant-REX',
  description: 'Your restaurant experience companion',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning data-gramm="false" data-gramm_editor="false">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className} suppressHydrationWarning data-gramm="false" data-gramm_editor="false">
        <ClientLayout>
                  {children}
        </ClientLayout>
      </body>
    </html>
  )
}
