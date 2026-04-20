'use client'
import Image from 'next/image'
import { signInWithGoogle } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

interface JourneyCardProps {
  user: User | null
  checkinCount?: number
  cityCount?: number
  gaoMessage?: string
  onOpen: () => void
}

const btnBase = "w-full text-left rounded-2xl shadow-brutal p-4 transition-all duration-150 hover:shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] active:scale-[0.98] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] cursor-pointer mb-5 mt-1"

export default function JourneyCard({
  user,
  checkinCount = 0,
  cityCount = 0,
  gaoMessage = '',
  onOpen,
}: JourneyCardProps) {
  if (!user) {
    return (
      <button onClick={signInWithGoogle} className={`${btnBase} bg-[#fff3d6] border-[3px] border-epicGreen/40`}>
        <div className="flex items-center gap-3">
          <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={64} height={64} className="object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Vul jouw Dumpling Mandje 🧺</p>
            <p className="text-xs text-inkBlack/50 mt-0.5 leading-snug">Log in en bewaar jouw dim sum reis</p>
          </div>
          <p className="text-xs font-black text-inkBlack/30 shrink-0">Start →</p>
        </div>
      </button>
    )
  }

  if (checkinCount === 0) {
    return (
      <button onClick={onOpen} className={`${btnBase} bg-[#fff3d6] border-[3px] border-inkBlack`}>
        <div className="flex items-center gap-3">
          <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={64} height={64} className="object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Vul jouw Dumpling Mandje 🧺</p>
            <p className="text-xs text-inkBlack/50 mt-0.5 leading-snug">Check in bij je eerste dim sum spot</p>
          </div>
          <p className="text-xs font-black text-inkBlack/30 shrink-0">Begin →</p>
        </div>
      </button>
    )
  }

  return (
    <button onClick={onOpen} className={`${btnBase} bg-[#fff3d6] border-[3px] border-inkBlack`}>
      <div className="flex items-center gap-3">
        <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={64} height={64} className="object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">Jouw Dumpling Reis</p>
          <p className="text-xs text-inkBlack/50 mt-0.5">
            {checkinCount} {checkinCount === 1 ? 'plek' : 'plekken'} · {cityCount} {cityCount === 1 ? 'stad' : 'steden'}
          </p>
          {gaoMessage && (
            <p className="text-[10px] text-inkBlack/40 italic mt-0.5">{gaoMessage}</p>
          )}
        </div>
        <p className="text-xs font-black text-inkBlack/30 shrink-0">Verder →</p>
      </div>
    </button>
  )
}
