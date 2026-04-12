'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Restaurant, City } from '@/lib/types'
import ScoreBar from './ScoreBar'
import StatusBadge from './StatusBadge'
import HaGaoIndex from './HaGaoIndex'
import Mascot from './Mascot'

interface RestaurantCardProps {
  restaurant: Restaurant
  rank?: number
  currentCity?: City | 'Alle'
}

const priceColor: Record<string, string> = {
  '€': 'text-epicGreen',
  '€€': 'text-epicGold',
  '€€€': 'text-epicRed',
}

function epicScoreStyle(score: number) {
  if (score >= 75) return { border: 'border-epicGreen', text: 'text-epicGreen', bg: 'bg-epicGreen/8' }
  if (score >= 55) return { border: 'border-epicGold', text: 'text-epicGold', bg: 'bg-epicGold/8' }
  return { border: 'border-epicRed', text: 'text-epicRed', bg: 'bg-epicRed/8' }
}

export default function RestaurantCard({ restaurant, rank, currentCity }: RestaurantCardProps) {
  const [showScoreDetail, setShowScoreDetail] = useState(false)

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

  const style = epicScoreStyle(epicScore)
  const cityParam = currentCity && currentCity !== 'Alle' ? `?city=${encodeURIComponent(currentCity)}` : ''

  return (
    <Link href={`/restaurant/${id}${cityParam}`}>
      <article className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm transition-all cursor-pointer">

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          {rank === 1 ? (
            <div className="flex items-center gap-1 mb-1">
              <img src="/mascots/EpicScoreBrand.png" alt="#1" className="w-6 h-6 object-contain" />
              <span className="text-[10px] font-black text-inkBlack/40">#1</span>
            </div>
          ) : rank && rank > 1 ? (
            <span className="text-[10px] font-black text-inkBlack/30 mb-1 block">#{rank}</span>
          ) : null}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-inkBlack text-lg leading-tight truncate">{name}</h2>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* EpicScore row */}
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-[10px] text-inkBlack/40 font-bold uppercase tracking-wide">EpicScore</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowScoreDetail((v) => !v) }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 ${style.border} ${style.bg}`}
            aria-label="Uitleg EpicScore"
          >
            <img src="/mascots/Epicscore.png" alt="" className="w-4 h-4 object-contain" />
            <span className={`text-2xl font-black leading-none ${style.text}`}>{epicScore}</span>
          </button>
        </div>

        {/* Ha Gao Index — only if we have real dumpling data */}
        {haGaoIndex > 0 ? (
          <div className="mx-4 mb-2 flex flex-col bg-[#fff3d6] border-2 border-inkBlack/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <img src="/mascots/HaGaoIndex.png" alt="Ha Gao Inspector" className="w-5 h-5 object-contain shrink-0" />
                <p className="text-[10px] font-black text-epicGold uppercase tracking-wide leading-none">Ha Gao Index</p>
              </div>
              <span className="text-base font-black text-inkBlack">{haGaoIndex.toFixed(1)}<span className="text-[10px] text-inkBlack/40">/5</span></span>
            </div>
            <div className="mt-1.5">
              <HaGaoIndex index={haGaoIndex} size="sm" />
            </div>
            {haGaoDetail && (
              <p className="text-[10px] text-inkBlack/50 italic leading-snug mt-1 line-clamp-2">{haGaoDetail}</p>
            )}
            {restaurant.dumplingMentionScore !== undefined && restaurant.dumplingMentionScore > 0 && (
              <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-inkBlack/10">
                <span className="text-[9px] text-inkBlack/40 font-bold uppercase tracking-wide">
                  {restaurant.dumplingMentionScore}% noemt dumplings
                </span>
                {restaurant.dumplingQualityScore !== undefined && restaurant.dumplingQualityScore !== null && (
                  <span className="text-[9px] font-black text-epicGold">
                    · {restaurant.dumplingQualityScore}% positief
                  </span>
                )}
              </div>
            )}
            {restaurant.confidence !== undefined && restaurant.confidence < 0.6 && (
              <div className="flex items-center gap-1 mt-1">
                <Mascot type="lowconfidence" size={18} alt="Beperkte data" />
                <p className="text-[9px] text-inkBlack/30 italic">Beperkt aantal reviews</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-4 mb-2 flex flex-col bg-inkBlack/5 border border-inkBlack/10 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-inkBlack/30 italic text-center leading-snug">
              Ha Gao Index wordt bepaald bij voldoende dumpling reviews
            </p>
          </div>
        )}

        {/* Tap-to-explain EpicScore */}
        {showScoreDetail && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-inkBlack/5 border border-inkBlack/10">
            <p className="text-[10px] text-inkBlack/60 leading-snug">
              <span className="block">🥟 <b>Ha Gao 40%</b> — dumplingkwaliteit telt het zwaarst</span>
              <span className="block">⭐ <b>Reputatie 25%</b> · 📡 <b>Online 20%</b> · ✨ <b>Vibe 10%</b></span>
              <span className="block italic opacity-70">Kleine plek, perfecte dumplings → wint van grote naam met slechte ha gao</span>
            </p>
          </div>
        )}

        {/* Compact rankReason */}
        {rankReason && (
          <p className="px-4 pb-1 text-[10px] text-inkBlack/40 italic leading-snug line-clamp-1">— {rankReason}</p>
        )}

        {/* Score bars */}
        <div className="px-4 pb-1 space-y-1.5">
          <ScoreBar label="Reputatie" score={scores.google} color="#D85A30" />
          <ScoreBar label="Online aandacht" score={scores.buzz} color="#534AB7" />
          <ScoreBar label="Vibe" score={scores.vibe} color="#1D9E75" />
        </div>

        {/* Must order */}
        <div className="mx-4 my-2 px-3 py-2 rounded-xl border-[2px] border-dashed border-epicGold/70 bg-epicGold/5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Mascot type="mustorder" size={26} alt="Must order" />
            <p className="text-xs font-bold text-epicGold uppercase tracking-wide">Must order</p>
          </div>
          <p className="text-xs text-inkBlack leading-snug line-clamp-2">{mustOrder}</p>
        </div>

        {/* Source pills + CTAs */}
        <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium">
            ⭐ {sources.googleRating.toFixed(1)}
            {sources.googleReviewCount > 0 && (
              <span className="text-inkBlack/40 ml-1">({sources.googleReviewCount.toLocaleString('nl-NL')})</span>
            )}
          </span>
          {scores.buzz >= 40 && (
            <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
              📡 Online aandacht
            </span>
          )}
          {sources.blogMentions > 0 && (
            <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-medium">
              {sources.blogMentions} vermeldingen
            </span>
          )}
          {(Date.now() - new Date(sources.lastUpdated).getTime()) > 30 * 24 * 60 * 60 * 1000 && (
            <span className="text-xs bg-inkBlack/5 border border-inkBlack/10 text-inkBlack/35 rounded-full px-2 py-0.5 font-medium">
              ↻ ouder dan 30 dgn
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${restaurant.googlePlaceId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-inkBlack/30 text-inkBlack/50 active:border-inkBlack active:text-inkBlack transition-colors whitespace-nowrap"
            >
              Route →
            </a>
            <a
              href={restaurant.reservationUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-epicGreen/40 text-epicGreen active:bg-epicGreen/10 transition-colors whitespace-nowrap"
            >
              Reserveer →
            </a>
          </div>
        </div>

        {/* Footer bar */}
        <div className="h-1.5 bg-epicGreen" />
      </article>
    </Link>
  )
}
