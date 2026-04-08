import Link from 'next/link'
import { Restaurant } from '@/lib/types'

interface HiddenGemAlertProps {
  restaurant: Restaurant
}

export default function HiddenGemAlert({ restaurant }: HiddenGemAlertProps) {
  // Don't show hidden gem if score is unreliable
  if (
    !restaurant ||
    restaurant.epicScore < 10 ||
    !restaurant.mustOrder ||
    restaurant.mustOrder.includes('bepaald')
  ) {
    return null
  }

  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-epicPurple/10 p-4 flex items-start gap-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm transition-all cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-epicPurple border-2 border-inkBlack flex items-center justify-center text-xl shrink-0">
          💎
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wide text-epicPurple">
              Nieuw gespot
            </span>
            <span className="text-xs bg-epicPurple text-white px-2 py-0.5 rounded-full font-bold border border-inkBlack">
              {restaurant.city}
            </span>
          </div>
          <p className="font-black text-inkBlack text-sm leading-snug">
            <span className="text-epicPurple">{restaurant.name}</span> klimt snel in de rankings!
          </p>
          <p className="text-xs text-inkBlack/60 mt-0.5 truncate">
            {restaurant.epicScore > 10 && `EpicScore: ${restaurant.epicScore} · `}{restaurant.mustOrder}
          </p>
        </div>
        <div className="text-inkBlack/40 text-sm shrink-0">→</div>
      </div>
    </Link>
  )
}
