import Link from 'next/link'
import { Restaurant } from '@/lib/types'
import ScoreBar from './ScoreBar'
import StatusBadge from './StatusBadge'
import HaGaoIndex from './HaGaoIndex'

interface RestaurantCardProps {
  restaurant: Restaurant
}

const priceColor: Record<string, string> = {
  '€': 'text-epicGreen',
  '€€': 'text-epicGold',
  '€€€': 'text-epicRed',
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const {
    id,
    name,
    city,
    priceRange,
    status,
    epicScore,
    scores,
    mustOrder,
    haGaoIndex,
    sources,
  } = restaurant

  return (
    <Link href={`/restaurant/${id}`}>
      <article className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-brutal-sm transition-all cursor-pointer group">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-inkBlack text-lg leading-tight truncate group-hover:text-epicRed transition-colors">
                {name}
              </h2>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={status} />
              {/* EpicScore badge */}
              <div className="flex items-center gap-1 bg-epicRed text-cream px-2.5 py-0.5 rounded-full border-2 border-inkBlack shadow-brutal-sm">
                <span className="text-xs font-black">Epic</span>
                <span className="text-sm font-black">{epicScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score bars — renamed: Hype→Reputatie, Sfeer→Vibe */}
        <div className="px-4 pb-1 space-y-1.5">
          <ScoreBar label="Reputatie" score={scores.buzz} color="#534AB7" />
          <ScoreBar label="OG Score" score={scores.google} color="#D85A30" />
          <ScoreBar label="Vibe" score={scores.vibe} color="#1D9E75" />
        </div>

        {/* EpicScore formula */}
        <div className="px-4 pb-3 pt-1.5">
          <p className="text-[10px] text-inkBlack/30 font-medium">
            Google&nbsp;<span className="font-black text-inkBlack/40">35%</span>
            &nbsp;·&nbsp;Ha&nbsp;Gao&nbsp;<span className="font-black text-inkBlack/40">25%</span>
            &nbsp;·&nbsp;Buzz&nbsp;<span className="font-black text-inkBlack/40">25%</span>
            &nbsp;·&nbsp;Vibe&nbsp;<span className="font-black text-inkBlack/40">15%</span>
          </p>
        </div>

        {/* Must order */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl border-[2px] border-dashed border-epicGold/70 bg-epicGold/5">
          <p className="text-xs font-bold text-epicGold uppercase tracking-wide mb-0.5">Must order</p>
          <p className="text-xs text-inkBlack leading-snug line-clamp-2">{mustOrder}</p>
        </div>

        {/* Ha Gao Index + source pills */}
        <div className="px-4 pb-3 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs font-bold text-inkBlack/50 uppercase tracking-wide mb-1">Ha Gao Index</p>
            <HaGaoIndex index={haGaoIndex} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium">
              ⭐ {sources.googleRating.toFixed(1)}
            </span>
            <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium">
              Iens
            </span>
            <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
              TikTok
            </span>
            {sources.blogMentions > 0 && (
              <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
                {sources.blogMentions} buzz
              </span>
            )}
          </div>
        </div>

        {/* Footer bar */}
        <div className="h-2 bg-epicGreen" />
      </article>
    </Link>
  )
}
