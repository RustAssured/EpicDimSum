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

// Fix F: subtle color palette — tinted bg, colored border and text, not a solid fill
function epicScoreStyle(score: number) {
  if (score >= 75) return { border: 'border-epicGreen', text: 'text-epicGreen', bg: 'bg-epicGreen/8' }
  if (score >= 55) return { border: 'border-epicGold', text: 'text-epicGold', bg: 'bg-epicGold/8' }
  return { border: 'border-epicRed', text: 'text-epicRed', bg: 'bg-epicRed/8' }
}

// Fix G: Gao as score signal
function epicScoreGao(score: number): 'happy' | 'sleepy' | 'lowconfidence' {
  if (score >= 75) return 'happy'
  if (score >= 55) return 'sleepy'
  return 'lowconfidence'
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
  const gaoType = epicScoreGao(epicScore)

  // Fix A: carry city param so back-nav restores city filter
  const cityParam = currentCity && currentCity !== 'Alle' ? `?city=${encodeURIComponent(currentCity)}` : ''

  return (
    <Link href={`/restaurant/${id}${cityParam}`}>
      <article className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm transition-all cursor-pointer">

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          {rank && (
            <p className="text-[10px] font-black text-inkBlack/30 mb-0.5">#{rank}</p>
          )}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {rank === 1 && (
                  <Mascot type="top1" size={44} className="-mt-2" alt="#1 beste dim sum" />
                )}
                <h2 className="font-black text-inkBlack text-lg leading-tight truncate">
                  {name}
                </h2>
              </div>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Fix G: Gao (32px) next to EpicScore badge + Ha Gao — side by side */}
        <div className="px-4 pb-2 grid grid-cols-[auto_1fr] gap-3">

          {/* Left: Gao + EpicScore badge */}
          <div className="flex items-center gap-2">
            <Mascot type={gaoType} size={32} alt="" />
            <div className={`flex flex-col items-center border-2 rounded-xl px-3 py-2 min-w-[56px] ${style.bg} ${style.border}`}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowScoreDetail((v) => !v) }}
                className={`text-[9px] font-black uppercase tracking-wider ${style.text} opacity-70`}
                aria-label="Uitleg EpicScore"
              >
                Epic ⓘ
              </button>
              <span className={`text-3xl font-black leading-none ${style.text}`}>{epicScore}</span>
              <span className={`text-[9px] font-bold ${style.text} opacity-40`}>/100</span>
            </div>
          </div>

          {/* Right: Ha Gao Index */}
          <div className="flex flex-col justify-center bg-[#fff3d6] border-2 border-inkBlack/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-black text-epicGold uppercase tracking-wide leading-none">🥟 Ha Gao Index</p>
              <span className="text-base font-black text-inkBlack">{haGaoIndex.toFixed(1)}<span className="text-[10px] text-inkBlack/40">/5</span></span>
            </div>
            <div className="mt-1.5">
              <HaGaoIndex index={haGaoIndex} size="sm" />
            </div>
            {haGaoDetail && (
              <p className="text-[10px] text-inkBlack/50 italic leading-snug mt-1 line-clamp-2">{haGaoDetail}</p>
            )}
            {restaurant.dumplingMentionScore !== undefined && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-inkBlack/10">
                <span className="text-[9px] text-inkBlack/40 uppercase tracking-wide font-bold">
                  {restaurant.dumplingMentionScore}% noemt dumplings
                </span>
                {restaurant.dumplingQualityScore !== null && restaurant.dumplingQualityScore !== undefined && (
                  <span className="text-[9px] font-black text-epicGold">· {restaurant.dumplingQualityScore}% positief</span>
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
        </div>

        {/* Tap-to-explain, max 3 lines */}
        {showScoreDetail && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-inkBlack/5 border border-inkBlack/10">
            <p className="text-[10px] text-inkBlack/60 leading-snug">
              <span className="block">🥟 <b>Ha Gao 40%</b> — dumplingkwaliteit telt het zwaarst</span>
              <span className="block">⭐ <b>Reputatie 25%</b> · 📡 <b>Online 20%</b> · ✨ <b>Vibe 10%</b></span>
              <span className="block italic opacity-70">Kleine plek, perfecte dumplings → wint van grote naam met slechte ha gao</span>
            </p>
          </div>
        )}

        {/* Compact rankReason — one subtle line */}
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

        {/* Source pills */}
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
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${restaurant.googlePlaceId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-inkBlack/30 text-inkBlack/50 active:border-epicGreen active:text-epicGreen transition-colors whitespace-nowrap"
          >
            Bekijk op Maps →
          </a>
        </div>

        {/* Footer bar */}
        <div className="h-1.5 bg-epicGreen" />
      </article>
    </Link>
  )
}
