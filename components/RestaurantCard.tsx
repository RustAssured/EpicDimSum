'use client'

import { useState } from 'react'
import Image from 'next/image'
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
  distance?: number // in km
}

const priceColor: Record<string, string> = {
  '€': 'text-epicGreen',
  '€€': 'text-epicGold',
  '€€€': 'text-epicRed',
}

function dumplingScale(score: number): { count: number; label: string } {
  if (score >= 80) return { count: 5, label: 'Gao is door het dolle' }
  if (score >= 70) return { count: 4, label: 'Gao is blij' }
  return { count: 3, label: 'Gao is fan' }
}

function dumplingStatus(restaurant: Restaurant): string {
  const haGao = restaurant.haGaoIndex ?? 0
  const mentions = restaurant.dumplingMentionScore ?? 0
  const quality = restaurant.dumplingQualityScore ?? 0

  if (haGao >= 4.0 && mentions >= 30 && quality >= 70) {
    return 'Gao zweert bij deze dumplings'
  }
  if (haGao >= 3.5) {
    return 'Gao komt hier graag terug'
  }
  if (haGao >= 2.5 && mentions >= 15) {
    return 'Gao is aan het ontdekken'
  }
  return ''
}

export default function RestaurantCard({ restaurant, rank, currentCity, distance }: RestaurantCardProps) {
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

  const cityParam = currentCity && currentCity !== 'Alle' ? `?city=${encodeURIComponent(currentCity)}` : ''

  return (
    <Link href={`/restaurant/${id}${cityParam}`}>
      <article className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden active:translate-x-[3px] active:translate-y-[3px] active:shadow-brutal-sm transition-all cursor-pointer">

        {/* Distance banner — shown when sorting by location */}
        {distance !== undefined && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-inkBlack/5 border-b border-inkBlack/10">
            <Image src="/mascots/dumpling-pin.png" alt="" width={14} height={14} className="object-contain" />
            <p className="text-xs font-black text-inkBlack">
              {distance < 1
                ? `${Math.round(distance * 1000)} meter van jou`
                : `${distance.toFixed(1)} km van jou`
              }
            </p>
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          {rank === 1 ? (
            <div className="flex items-center gap-1 mb-1">
              <Image src="/mascots/EpicScoreBrand.png" alt="#1" width={24} height={24} className="object-contain" />
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

        {/* Dumpling scale */}
        <div className="px-4 pb-2">
          {(() => {
            const { count, label } = dumplingScale(epicScore ?? 0)
            return (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowScoreDetail((v) => !v) }}
                className="flex flex-col items-center gap-1 w-full"
                aria-label="Uitleg EpicScore"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Image
                      key={i}
                      src="/mascots/dumpling.png"
                      alt="dumpling"
                      width={i < count ? 20 : 16}
                      height={i < count ? 20 : 16}
                      className={`object-contain transition-all ${i < count ? 'opacity-100' : 'opacity-20'}`}
                    />
                  ))}
                </div>
                <p className="text-[9px] font-black text-inkBlack/50 leading-none">{label}</p>
              </button>
            )
          })()}
        </div>

        {/* Ha Gao Index — only if we have real dumpling data */}
        {haGaoIndex > 0 ? (
          <div className="mx-4 mb-2 flex flex-col bg-[#fff3d6] border-2 border-inkBlack/20 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Image src="/mascots/HaGaoIndex.png" alt="Ha Gao Inspector" width={20} height={20} className="object-contain shrink-0" />
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
            {/* Human status line — always visible */}
            <div className="mt-1.5 pt-1.5 border-t border-inkBlack/10">
              <p className="text-[10px] font-black text-inkBlack/50">
                {dumplingStatus(restaurant)}
              </p>
            </div>
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
              <span className="block"><b>Reputatie 25%</b> · <b>Online 20%</b> · <b>Vibe 10%</b></span>
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
          <span className="text-xs bg-cream border border-inkBlack/20 rounded-full px-2 py-0.5 font-medium text-inkBlack/60">
            {sources.googleRating.toFixed(1)} ({sources.googleReviewCount > 999
              ? Math.round(sources.googleReviewCount / 1000) + 'k'
              : sources.googleReviewCount})
          </span>
          {scores.buzz >= 40 && (
            <span className="text-xs bg-epicPurple/10 border border-epicPurple/30 text-epicPurple rounded-full px-2 py-0.5 font-bold">
              trending
            </span>
          )}
          {(sources.blogMentions ?? 0) > 2 && (
            <span className="text-xs bg-epicGreen/10 border border-epicGreen/30 text-epicGreen rounded-full px-2 py-0.5 font-bold">
              {sources.blogMentions}× vermeld
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
