import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getPublicRestaurants } from '@/lib/db'
import RestaurantFeed from '@/components/RestaurantFeed'
import About from '@/components/About'
import ReisNavItem from '@/components/ReisNavItem'
import { DAGBOEK_COUNT } from '@/lib/dagboek'

// Always render fresh — admin publishes must show immediately, no ISR delay.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const restaurants = await getPublicRestaurants()

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/mascots/MasterGao.png" alt="Gao" width={36} height={36} className="object-contain shrink-0" />
            <div>
              <h1 className="font-black leading-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '0.01em', fontSize: '1rem' }}>
                <span className="text-epicRed">Epic</span>
                <span className="text-epicGreen">Dim</span>
                <span className="text-epicGold">Sum</span>
              </h1>
              <p className="text-[9px] text-inkBlack/40 font-medium leading-none mt-0.5 hidden sm:block">
                Plekken waar Gao voor juicht
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <About />
            <ReisNavItem count={DAGBOEK_COUNT} />
            <a href="/admin/sync" className="text-xs text-inkBlack/30 hover:text-inkBlack/60 transition-colors">
              Admin
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <Suspense fallback={null}>
          <RestaurantFeed restaurants={restaurants} />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="border-t-[3px] border-inkBlack mt-12 py-6 bg-inkBlack text-cream">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="font-black text-lg tracking-tight" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '0.01em' }}>
            <span className="text-epicRed">Epic</span>
            <span className="text-epicGreen">Dim</span>
            <span className="text-epicGold">Sum</span>
          </p>
          <p className="text-xs text-cream/40 mt-1">
            De beste dim sum in Nederland. Powered by EpicScore™
          </p>
          <Link
            href="/privacy"
            className="text-xs text-cream/40 hover:text-cream/70 transition-colors mt-2 inline-block"
          >
            Privacy
          </Link>
        </div>
      </footer>
    </main>
  )
}
