import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getPublicRestaurants } from '@/lib/db'
import RestaurantFeed from '@/components/RestaurantFeed'
import About from '@/components/About'

export const revalidate = 3600

export default async function Home() {
  const restaurants = await getPublicRestaurants()

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Image src="/mascots/MasterGao.png" alt="Gao" width={40} height={40} className="object-contain shrink-0" />
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-black tracking-tight leading-none">
                <span className="text-epicRed">Epic</span>
                <span className="text-epicGreen">Dim</span>
                <span className="text-epicGold">Sum</span>
              </h1>
              <p className="text-[10px] text-inkBlack/50 font-medium hidden sm:block">
                Gao is jouw gids naar de beste dumplings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <About />
            <Link
              href="/reis"
              className="flex items-center gap-1 text-xs font-bold text-inkBlack/40 hover:text-inkBlack/70 transition-colors"
            >
              <Image src="/mascots/dumpling-pin.png" alt="" width={14} height={14} className="object-contain" />
              Reis
            </Link>
            <Link
              href="/admin/sync"
              className="text-xs text-inkBlack/30 hover:text-inkBlack/60 transition-colors"
            >
              Admin
            </Link>
          </div>
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
          <p className="font-black text-lg">
            <span className="text-epicRed">Epic</span>
            <span className="text-epicGreen">Dim</span>
            <span className="text-epicGold">Sum</span>
          </p>
          <p className="text-xs text-cream/40 mt-1">
            De beste dim sum in Nederland — Powered by EpicScore™
          </p>
        </div>
      </footer>
    </main>
  )
}
