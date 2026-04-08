import Link from 'next/link'
import { getAllRestaurants } from '@/lib/db'
import RestaurantFeed from '@/components/RestaurantFeed'

export const revalidate = 3600

export default async function Home() {
  const restaurants = await getAllRestaurants()

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Logo with steam */}
            <div className="relative">
              <div className="absolute -top-5 left-0 right-0 flex justify-around pointer-events-none">
                <div className="steam-line w-0.5 h-4 bg-inkBlack/30 rounded-full" />
                <div className="steam-line w-0.5 h-5 bg-inkBlack/30 rounded-full" />
                <div className="steam-line w-0.5 h-3 bg-inkBlack/30 rounded-full" />
              </div>
              <span className="text-2xl">🥟</span>
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight">
                <span className="text-epicRed">Epic</span>
                <span className="text-epicGreen">Dim</span>
                <span className="text-epicGold">Sum</span>
              </h1>
              <p className="text-[10px] text-inkBlack/50 font-medium leading-none mt-0.5 hidden sm:block">
                Jouw realtime dumpling radar 🥟
              </p>
            </div>
          </div>
          <Link
            href="/admin/sync"
            className="text-xs text-inkBlack/30 hover:text-inkBlack/60 transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <RestaurantFeed restaurants={restaurants} />
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
