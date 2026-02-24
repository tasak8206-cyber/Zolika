import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Zolika - E-commerce Price Monitoring',
  description: 'Monitor és kezel e-commerce termék árakat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hu">
      <head>
        {/* ✅ BASIC META TAGS */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        {/* ✅ GYEREK KOMPONENSEK */}
        {children}
      </body>
    </html>
  )
}