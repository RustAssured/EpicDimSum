import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllRestaurants, getRestaurantById } from '@/lib/db'
import StatusBadge from '@/components/StatusBadge'
import ScoreBar from '@/components/ScoreBar'
import HaGaoIndex from '@/components/HaGaoIndex'
import ShareButton from '@/components/ShareButton'
import Mascot from '@/components/Mascot'
import CheckIn from '@/components/CheckIn'
import Image from 'next/image'

export const revalidate = 3600

interface PageProps {
  params: { id: string }
}

export async function generateStaticParams() {
  const restaurants = await getAllRestaurants()
  return restaurants.map((r) => ({ id: r.id }))
}

const priceLabel: Record<string, string> = {
  '€': 'Budget',
  '€€': 'Midden',
  '€€€': 'Luxe',
}

export default async function RestaurantPage({ params }: PageProps) {
  const [restaurant, allRestaurants] = await Promise.all([
    getRestaurantById(params.id),
    getAllRestaurants(),
  ])
  if (!restaurant) notFound()

  const {
    name, city, address, cuisine, priceRange, status, epicScore,
    haGaoIndex, haGaoDetail, rankReason, scores, mustOrder,
    summary, reviewSnippets, sources, coords,
  } = restaurant

  const lastUpdated = new Date(sources.lastUpdated).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const mascotType = restaurant.epicScore >= 80 ? 'happy'
    : restaurant.confidence !== undefined && restaurant.confidence < 0.6 ? 'judge'
    : 'happy'

  // Similar restaurants: up to 2 others from the same city
  const similar = allRestaurants
    .filter((r) => r.city === city && r.id !== params.id)
    .sort((a, b) => b.epicScore - a.epicScore)
    .slice(0, 2)

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
          {/* Gao verdict header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-inkBlack/10">
            <div>
              <p className="text-[10px] text-inkBlack/40 uppercase tracking-widest font-bold mb-1">
                EpicDimSum oordeel
              </p>
              <p className="text-sm font-black text-inkBlack/70 italic leading-snug max-w-[200px]">
                {restaurant.rankReason ?? 'Analyse gebaseerd op dumpling intelligence'}
              </p>
            </div>
            <Mascot
              type={mascotType}
              size={72}
              className="shrink-0 -mt-2"
              alt="Gao beoordeelt dit restaurant"
            />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-black text-inkBlack leading-tight">{name}</h1>
                <p className="text-sm text-inkBlack/50 font-medium mt-0.5">
                  {city} &middot; {cuisine} &middot;{' '}
                  <span className="font-bold">{priceRange} ({priceLabel[priceRange]})</span>
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
            <div className="space-y-2 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wide text-inkBlack/40">EpicScore Breakdown</h3>
              <ScoreBar label="Google" score={scores.google} color="#D85A30" />
              <ScoreBar label="Ha Gao" score={scores.haGao} color="#1D9E75" />
              <ScoreBar label="Online aandacht" score={scores.buzz} color="#534AB7" />
              <ScoreBar label="Vibe" score={scores.vibe} color="#BA7517" />
            </div>

            {/* Sources */}
            <div className="flex gap-1.5 justify-end flex-wrap">
              <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium">
                ⭐ {sources.googleRating.toFixed(1)} ({sources.googleReviewCount.toLocaleString('nl-NL')})
              </span>
              {sources.blogMentions > 0 && (
                <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
                  {sources.blogMentions} vermeldingen
                </span>
              )}
            </div>
          </div>
          <div className="h-2 bg-epicGreen" />
        </div>

        {/* Ha Gao Index hero */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-epicGreen/5 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Image src="/mascots/HaGaoIndex.png" alt="Ha Gao Inspector" width={32} height={32} className="object-contain shrink-0" />
                  <p className="text-sm font-black text-inkBlack">Ha Gao Index</p>
                </div>
                <p className="text-[10px] text-epicGreen/70 uppercase tracking-wide font-bold">
                  de ultieme dumplingtest · Ha Gao 60% + Siu Mai 40%
                </p>
              </div>
              <HaGaoIndex index={haGaoIndex} />
            </div>
            {haGaoDetail && (
              <p className="text-sm text-inkBlack/70 italic leading-relaxed border-l-3 border-epicGreen/40 pl-3">
                {haGaoDetail}
              </p>
            )}
          </div>
        </div>

        {/* Rank reason callout */}
        {rankReason && (
          <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-epicPurple/5 p-4 flex items-start gap-3">
            <span className="text-xl shrink-0">→</span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-epicPurple mb-1">Waarom deze rank</p>
              <p className="text-sm font-bold text-inkBlack leading-snug">{rankReason}</p>
            </div>
          </div>
        )}

        {/* Must order */}
        <div className="rounded-2xl border-[3px] border-dashed border-epicGold shadow-brutal bg-epicGold/5 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-epicGold mb-2">🍽️ Must Order</p>
          <p className="text-sm font-bold text-inkBlack leading-snug">{mustOrder}</p>
        </div>

        {/* Check-in */}
        <CheckIn restaurantId={restaurant.id} restaurantName={name} restaurantCity={city} />

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

        {/* Vergelijkbaar met */}
        {similar.length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-inkBlack/40 mb-2">
              Vergelijkbaar met
            </h3>
            <div className="flex flex-wrap gap-2">
              {similar.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurant/${r.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-inkBlack bg-white shadow-brutal-sm font-bold text-sm hover:bg-epicRed hover:text-cream transition-colors"
                >
                  {r.name}
                  <span className="text-xs opacity-60">Epic {r.epicScore}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
