'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Restaurant, City } from '@/lib/types'
import StatusBadge from './StatusBadge'
import DimSumGraadmeter from './DimSumGraadmeter'

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

function getDimSumIcon(dish: string): string | null {
  const d = dish.toLowerCase()
  if (d.includes('ha gao') || d.includes('har gow') || d.includes('garnaal')) return '/mascots/dim-pin.png'
  if (d.includes('siew mai') || d.includes('siu mai')) return '/mascots/siew-mai.png'
  if (d.includes('cheung fun') || d.includes('rijstrol')) return '/mascots/ricerolls.png'
  if (d.includes('bao') || d.includes('broodje') || d.includes('bun')) return '/mascots/lotus-bun.png'
  if (d.includes('lo mai') || d.includes('lotus')) return '/mascots/leaf-rice.png'
  if (d.includes('toast') || d.includes('garnalen toast')) return '/mascots/shrimp-toast.png'
  if (d.includes('spons') || d.includes('sponge') || d.includes('cake')) return '/mascots/sponge-cake.png'
  if (d.includes('water') || d.includes('chestn')) return '/mascots/water-chestnut.png'
  if (d.includes('pens') || d.includes('tripe') || d.includes('maag')) return '/mascots/beef-stomache.png'
  return null
}

export default function RestaurantCard({ restaurant, rank, currentCity, distance }: RestaurantCardProps) {
  const { id, name, city, priceRange, status, epicScore, mustOrder, haGaoIndex, verified } = restaurant

  const { count: dumplingCount, label: gaoLabel } = dumplingScale(epicScore ?? 0)
  const cityParam = currentCity && currentCity !== 'Alle' ? `?city=${encodeURIComponent(currentCity)}` : ''

  const routeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${restaurant.googlePlaceId}`
  const reservationFallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + city)}`

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
        <div className="px-4 pt-5 pb-2">
          {rank === 1 ? (
            <div className="flex items-center gap-1 mb-1">
              <Image src="/mascots/EpicScoreBrand.png" alt="#1" width={24} height={24} className="object-contain" />
              <span className="text-[10px] font-black text-inkBlack/40">#1</span>
            </div>
          ) : rank && rank > 1 ? (
            <span className="text-[10px] font-black text-inkBlack/30 mb-1 block">#{rank}</span>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-inkBlack text-lg leading-tight truncate">{name}</h2>
                {verified && (
                  <Image src="/mascots/dim-journey.png" width={20} height={20} alt="EpicSpot" unoptimized className="object-contain shrink-0" />
                )}
              </div>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Dumpling rating + graadmeter */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-0.5 mb-1">
                {[
                  '/mascots/shrimp-toast.png',
                  '/mascots/siew-mai.png',
                  '/mascots/leaf-rice.png',
                  '/mascots/ricerolls.png',
                  '/mascots/lotus-bun.png',
                ].map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt=""
                    width={i < dumplingCount ? 26 : 18}
                    height={i < dumplingCount ? 26 : 18}
                    className={`object-contain transition-all ${
                      i < dumplingCount ? 'opacity-100' : 'opacity-15'
                    }`}
                    unoptimized
                  />
                ))}
              </div>
              <p className="text-[10px] font-black text-inkBlack/50">{gaoLabel}</p>
              <p className="text-[10px] text-inkBlack/40 opacity-70 mt-1">Gao&apos;s graadmeter, niet het menu</p>
            </div>
          </div>
        </div>

        {/* Must Order */}
        {mustOrder && (
          <div className="mx-4 mb-3 px-3 py-2 bg-epicGold/8 border border-epicGold/20 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              {getDimSumIcon(mustOrder) && (
                <Image src={getDimSumIcon(mustOrder)!} alt="" width={16} height={16} className="object-contain" unoptimized />
              )}
              <p className="text-[9px] font-black text-epicGold uppercase tracking-wide">Must Order</p>
            </div>
            <p className="text-xs font-black text-inkBlack">{mustOrder}</p>
          </div>
        )}

        {/* Community check-in counter — only when ≥ 3 visitors */}
        {(restaurant.communityCheckins ?? 0) >= 3 && (
          <p className="px-4 pb-2 text-[11px] text-inkBlack/40">
            🥟 {restaurant.communityCheckins} dim sum liefhebbers zijn hier geweest
          </p>
        )}

        {/* CTA row */}
        <div className="px-4 pb-4 flex gap-2">
          <a
            href={routeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 py-2 text-center text-[11px] font-black border-2 border-inkBlack rounded-xl bg-cream"
          >
            Route →
          </a>
          <a
            href={restaurant.reservationUrl ?? reservationFallback}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-[2] py-2 text-center text-[11px] font-black border-2 border-inkBlack rounded-xl bg-epicGreen text-cream"
          >
            Reserveer →
          </a>
        </div>

        {/* Footer bar */}
        <div className="h-1.5 bg-epicGreen" />
      </article>
    </Link>
  )
}
