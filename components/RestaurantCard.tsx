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

        </div>

        {/* EpicScore + Ha Gao — side by side */}
        <div className="px-4 pb-3 grid grid-cols-[auto_1fr] gap-3 mt-2">

          {/* Left: EpicScore — compact */}
          <div className="flex flex-col justify-center items-center bg-epicRed/10 border-2 border-epicRed/30 rounded-xl px-3 py-3 min-w-[80px]">
            <p className="text-[9px] font-black text-epicRed uppercase tracking-wide leading-none">Epic</p>
            <p className="text-3xl font-black text-epicRed leading-none mt-1">{epicScore}</p>
            <p className="text-[9px] text-epicRed/50 font-bold leading-none mt-0.5">/100</p>
          </div>

          {/* Right: Ha Gao Index — takes remaining space */}
          <div className="flex flex-col justify-center bg-[#fff3d6] border-2 border-inkBlack/20 rounded-xl px-3 py-3">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-black text-epicGold uppercase tracking-wide leading-none">🥟 Ha Gao Index</p>
              <span className="text-base font-black text-inkBlack">{haGaoIndex.toFixed(1)}<span className="text-[10px] text-inkBlack/40">/5</span></span>
            </div>
            <div className="mt-1.5">
              <HaGaoIndex index={haGaoIndex} size="sm" />
            </div>
            {haGaoDetail && (
              <p className="text-[10px] text-inkBlack/50 italic leading-snug mt-1.5 line-clamp-2">{haGaoDetail}</p>
            )}
            {restaurant.dumplingMentionScore !== undefined && (
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-inkBlack/10">
                <div>
                  <span className="text-[9px] text-inkBlack/40 uppercase tracking-wide font-bold block">
                    {restaurant.dumplingMentionScore}% noemt dumplings
                  </span>
                  {restaurant.dumplingQualityScore !== null && restaurant.dumplingQualityScore !== undefined && (
                    <span className="text-[9px] font-black text-epicGold block mt-0.5">
                      {restaurant.dumplingQualityScore}% positief
                    </span>
                  )}
                </div>
                {restaurant.dumplingQualityScore === null && (
                  <span className="text-[9px] text-inkBlack/30 italic">geen dumpling data</span>
                )}
              </div>
            )}
            {restaurant.confidence !== undefined && restaurant.confidence < 0.6 && (
              <p className="text-[9px] text-inkBlack/30 italic mt-1">Beperkt aantal reviews — score kan wijzigen</p>
            )}
          </div>

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
            Reputatie 25% · Ha Gao 40% · Buzz 20% · Vibe 10% + vertrouwen
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
