import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EpicDimSum, de beste Dim Sum in Nederland',
  description:
    'Jouw realtime dumpling radar voor de beste dim sum restaurants in Amsterdam, Rotterdam en Den Haag. Powered by de EpicScore.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'EpicDimSum, de beste Dim Sum in Nederland',
    description:
      'Realtime dim sum rankings voor heel Nederland. Ha Gao Index, EpicScore en meer.',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'EpicDimSum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EpicDimSum, de beste Dim Sum in Nederland',
    description: 'Niet de populairste dim sum. De beste dumplings.',
  },
  metadataBase: new URL('https://epicdimsum.nl'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-cream antialiased">
        {children}
      </body>
    </html>
  )
}
