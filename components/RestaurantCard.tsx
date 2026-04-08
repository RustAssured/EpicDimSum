import Link from 'next/link'
import { Restaurant } from '@/lib/types'
import ScoreBar from './ScoreBar'
import StatusBadge from './StatusBadge'
import HaGaoIndex from './HaGaoIndex'

interface RestaurantCardProps {
  restaurant: Restaurant
  rank?: number
}

const priceColor: Record<string, string> = {
  '€': 'text-epicGreen',
  '€€': 'text-epicGold',
  '€€€': 'text-epicRed',
}

export default function RestaurantCard({ restaurant, rank }: RestaurantCardProps) {
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
    haGaoDetail,
    rankReason,
    sources,
  } = restaurant

  return (
    <Link href={`/restaurant/${id}`}>
      <article className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-brutal-sm transition-all cursor-pointer group">

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          {/* Rank badge */}
          {rank && (
            <p className="text-[10px] font-black text-inkBlack/30 mb-0.5">#{rank}</p>
          )}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-inkBlack text-lg leading-tight truncate group-hover:text-epicRed transition-colors">
                {name}
              </h2>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* EpicScore — clean, no /100 */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-baseline gap-1 bg-epicRed text-cream px-3 py-1.5 rounded-xl border-2 border-inkBlack shadow-brutal-sm">
              <span className="text-[11px] font-black uppercase tracking-wider opacity-70">Epic</span>
              <span className="text-3xl font-black leading-none">{epicScore}</span>
            </div>
          </div>
        </div>

        {/* Ha Gao Index — HERO block */}
        <div className="mx-4 mb-3 px-3 py-3 rounded-xl bg-[#fff3d6] border-[3px] border-inkBlack shadow-[3px_3px_0px_#1D1D1D]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-black text-inkBlack leading-none">🥟 Ha Gao Index</p>
              <p className="text-[9px] text-epicGold uppercase tracking-widest leading-none mt-0.5 font-bold">de ultieme dumplingtest</p>
            </div>
            <div className="flex items-center gap-1.5">
              <HaGaoIndex index={haGaoIndex} size="sm" />
              <span className="text-sm font-black text-inkBlack">{haGaoIndex.toFixed(1)}</span>
            </div>
          </div>
          {haGaoDetail && (
            <p className="text-[11px] text-inkBlack/60 italic leading-snug mt-1 border-t border-inkBlack/10 pt-1">{haGaoDetail}</p>
          )}
        </div>

        {/* Score bars — fixed data mapping */}
        <div className="px-4 pb-1 space-y-1.5">
          <ScoreBar label="Reputatie" score={scores.google} color="#D85A30" />
          <ScoreBar label="Buzz" score={scores.buzz} color="#534AB7" />
          <ScoreBar label="Vibe" score={scores.vibe} color="#1D9E75" />
        </div>

        {/* Formula */}
        <div className="px-4 pt-0.5 pb-2">
          <p className="text-[10px] text-inkBlack/40 font-medium text-center">
            Reputatie 35% · Ha Gao 25% · Buzz 25% · Vibe 15%
          </p>
        </div>

        {/* rankReason — signature insight */}
        {rankReason && (
          <div className="mx-4 mb-3 pl-3 border-l-[3px] border-inkBlack/30">
            <p className="text-xs text-inkBlack/60 italic leading-snug">— {rankReason}</p>
          </div>
        )}

        {/* Must order */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl border-[2px] border-dashed border-epicGold/70 bg-epicGold/5">
          <p className="text-xs font-bold text-epicGold uppercase tracking-wide mb-0.5">Must order</p>
          <p className="text-xs text-inkBlack leading-snug line-clamp-2">{mustOrder}</p>
        </div>

        {/* Source pills */}
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
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

        {/* Footer bar */}
        <div className="h-2 bg-epicGreen" />
      </article>
    </Link>
  )
}
