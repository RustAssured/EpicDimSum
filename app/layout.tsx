import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EpicDimSum — De beste Dim Sum in Nederland',
  description:
    'Jouw realtime dumpling radar voor de beste dim sum restaurants in Amsterdam, Rotterdam en Den Haag. Powered by de EpicScore.',
  openGraph: {
    title: 'EpicDimSum — De beste Dim Sum in Nederland',
    description:
      'Realtime dim sum rankings voor heel Nederland. Ha Gao Index, buzzscore en meer.',
    type: 'website',
    locale: 'nl_NL',
    siteName: 'EpicDimSum',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EpicDimSum — De beste Dim Sum in Nederland',
    description: 'Jouw realtime dumpling radar 🥟',
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
      <body className="min-h-screen bg-cream antialiased">
        {children}
      </body>
    </html>
  )
}
