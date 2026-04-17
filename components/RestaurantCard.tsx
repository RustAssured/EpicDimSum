'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Restaurant, City } from '@/lib/types'
import StatusBadge from './StatusBadge'

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

function getMustOrderIcon(mustOrder: string): string {
  const m = mustOrder.toLowerCase()
  if (m.includes('siu mai') || m.includes('siew mai') || m.includes('siomay')) return 'Siew-Mai.png'
  if (m.includes('ha gao') || m.includes('har gow') || m.includes('har gau') || m.includes('garnalen') || m.includes('prawn')) return 'ha-gao.png'
  if (m.includes('uitzonderlijk') || m.includes('must') || m.includes('signature')) return 'Ha-Gao-star.png'
  return 'ha-gao.png'
}

export default function RestaurantCard({ restaurant, rank, currentCity, distance }: RestaurantCardProps) {
  const { id, name, city, priceRange, status, epicScore, mustOrder, haGaoIndex } = restaurant

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
        <div className="px-4 pt-4 pb-2">
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
              <h2 className="font-black text-inkBlack text-lg leading-tight truncate">{name}</h2>
              <p className="text-xs text-inkBlack/50 font-medium">
                {city} &middot; <span className={`font-bold ${priceColor[priceRange]}`}>{priceRange}</span>
              </p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Dumpling rating — the only score */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Image
                  key={i}
                  src="/mascots/dumpling.png"
                  alt=""
                  width={i < dumplingCount ? 26 : 18}
                  height={i < dumplingCount ? 26 : 18}
                  className={`object-contain transition-all ${
                    i < dumplingCount ? 'opacity-100' : 'opacity-15'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] font-black text-inkBlack/50">{gaoLabel}</p>
          </div>

          {/* Ha Gao subtle signal */}
          {haGaoIndex > 0 && (
            <div className="flex items-center gap-1 opacity-70">
              <Image src="/mascots/dumpling.png" alt="" width={12} height={12} className="object-contain" />
              <span className="text-[10px] font-bold text-inkBlack/50">
                {haGaoIndex.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Must Order */}
        {mustOrder && (
          <div className="mx-4 mb-3 px-3 py-2 bg-epicGold/8 border border-epicGold/20 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Image src={`/mascots/${getMustOrderIcon(mustOrder)}`} alt="Must Order" width={16} height={16} className="object-contain" />
              <p className="text-[9px] font-black text-epicGold uppercase tracking-wide">Must Order</p>
            </div>
            <p className="text-xs font-black text-inkBlack">{mustOrder}</p>
          </div>
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
