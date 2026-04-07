import { notFound } from 'next/navigation'
import Link from 'next/link'
import { promises as fs } from 'fs'
import path from 'path'
import { Restaurant } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import ScoreBar from '@/components/ScoreBar'
import HaGaoIndex from '@/components/HaGaoIndex'
import ShareButton from '@/components/ShareButton'

export const revalidate = 3600

interface PageProps {
  params: { id: string }
}

async function getRestaurant(id: string): Promise<Restaurant | null> {
  const filePath = path.join(process.cwd(), 'data', 'restaurants.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const restaurants: Restaurant[] = JSON.parse(raw)
  return restaurants.find((r) => r.id === id) ?? null
}

export async function generateStaticParams() {
  const filePath = path.join(process.cwd(), 'data', 'restaurants.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const restaurants: Restaurant[] = JSON.parse(raw)
  return restaurants.map((r) => ({ id: r.id }))
}

const priceLabel: Record<string, string> = {
  '€': 'Budget',
  '€€': 'Midden',
  '€€€': 'Luxe',
}

export default async function RestaurantPage({ params }: PageProps) {
  const restaurant = await getRestaurant(params.id)
  if (!restaurant) notFound()

  const {
    name, city, address, cuisine, priceRange, status, epicScore,
    haGaoIndex, scores, mustOrder, summary, reviewSnippets, sources, coords,
  } = restaurant

  const lastUpdated = new Date(sources.lastUpdated).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-black text-inkBlack/60 hover:text-inkBlack transition-colors"
          >
            ← Terug
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-black text-inkBlack truncate">{name}</p>
          </div>
          <div className="flex items-center gap-1 bg-epicRed text-cream px-2.5 py-0.5 rounded-full border-2 border-inkBlack shadow-brutal-sm text-sm font-black shrink-0">
            Epic {epicScore}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Hero card */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-black text-inkBlack leading-tight">{name}</h1>
                <p className="text-sm text-inkBlack/50 font-medium mt-0.5">
                  {city} &middot; {cuisine} &middot; <span className="font-bold">{priceRange} ({priceLabel[priceRange]})</span>
                </p>
                <p className="text-xs text-inkBlack/40 mt-0.5">{address}</p>
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Summary */}
            {summary && (
              <p className="text-sm text-inkBlack/80 leading-relaxed border-l-4 border-epicGreen pl-3 mb-4">
                {summary}
              </p>
            )}

            {/* Score bars */}
            <div className="space-y-2 mb-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-inkBlack/40">EpicScore Breakdown</h3>
              <ScoreBar label="Google" score={scores.google} color="#D85A30" />
              <ScoreBar label="Ha Gao" score={scores.haGao} color="#1D9E75" />
              <ScoreBar label="Buzz" score={scores.buzz} color="#534AB7" />
              <ScoreBar label="Sfeer" score={scores.vibe} color="#BA7517" />
            </div>

            {/* Ha Gao Index */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-inkBlack/40 mb-1">Ha Gao Index</p>
                <HaGaoIndex index={haGaoIndex} />
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-wide text-inkBlack/40 mb-1">Bronnen</p>
                <div className="flex gap-1.5 justify-end flex-wrap">
                  <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium">
                    ⭐ {sources.googleRating.toFixed(1)} ({sources.googleReviewCount.toLocaleString('nl-NL')})
                  </span>
                  {sources.blogMentions > 0 && (
                    <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
                      {sources.blogMentions} buzz
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="h-2 bg-epicGreen" />
        </div>

        {/* Must order */}
        <div className="rounded-2xl border-[3px] border-dashed border-epicGold shadow-brutal bg-epicGold/5 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-epicGold mb-2">🍽️ Must Order</p>
          <p className="text-sm font-bold text-inkBlack leading-snug">{mustOrder}</p>
        </div>

        {/* Review snippets */}
        {reviewSnippets && reviewSnippets.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wide text-inkBlack/40">Google Reviews</h3>
            {reviewSnippets.slice(0, 3).map((snippet, i) => (
              <div key={i} className="rounded-xl border-[2px] border-inkBlack/20 bg-white p-3">
                <p className="text-sm text-inkBlack/70 leading-relaxed line-clamp-3">
                  &ldquo;{snippet}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Map placeholder */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
          <div className="p-4">
            <h3 className="text-xs font-black uppercase tracking-wide text-inkBlack/40 mb-3">Locatie</h3>
            <div className="rounded-xl bg-cream border-[2px] border-inkBlack/20 p-4 font-mono text-sm">
              <p className="text-inkBlack/60">{address}</p>
              <p className="text-inkBlack/40 text-xs mt-2">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Share button */}
        <ShareButton name={name} />

        {/* Meta */}
        <p className="text-center text-xs text-inkBlack/30">
          Laatste update: {lastUpdated}
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t-[3px] border-inkBlack mt-8 py-6 bg-inkBlack text-cream">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Link href="/" className="font-black text-lg hover:opacity-80 transition-opacity">
            <span className="text-epicRed">Epic</span>
            <span className="text-epicGreen">Dim</span>
            <span className="text-epicGold">Sum</span>
          </Link>
          <p className="text-xs text-cream/40 mt-1">De beste dim sum in Nederland</p>
        </div>
      </footer>
    </main>
  )
}
