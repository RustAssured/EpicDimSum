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

export default function JourneyCard({
  user,
  checkinCount = 0,
  cityCount = 0,
  gaoMessage = '',
  onOpen,
}: JourneyCardProps) {
  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="w-full text-left rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] p-4 active:scale-[0.99] transition-transform mb-4"
      >
        <div className="flex items-center gap-3">
          <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={48} height={48} className="object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Jouw Dumpling Reis</p>
            <p className="text-xs text-inkBlack/50 mt-0.5 leading-snug">Gao wacht op je eerste plek</p>
          </div>
          <p className="text-xs font-black text-inkBlack/30 shrink-0">Start →</p>
        </div>
      </button>
    )
  }

  if (checkinCount === 0) {
    return (
      <button
        onClick={onOpen}
        className="w-full text-left rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] p-4 active:scale-[0.99] transition-transform mb-4"
      >
        <div className="flex items-center gap-3">
          <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={48} height={48} className="object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Jouw Dumpling Reis</p>
            <p className="text-xs text-inkBlack/50 mt-0.5 leading-snug">Begin met je eerste check-in</p>
          </div>
          <p className="text-xs font-black text-inkBlack/30 shrink-0">Open →</p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] p-4 active:scale-[0.99] transition-transform mb-4"
    >
      <div className="flex items-center gap-3">
        <Image src="/mascots/GaoMandje.png" alt="Dumpling Reis" width={48} height={48} className="object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">Jouw Dumpling Reis</p>
          <p className="text-xs text-inkBlack/50 mt-0.5">
            {checkinCount} {checkinCount === 1 ? 'plek' : 'plekken'} · {cityCount} {cityCount === 1 ? 'stad' : 'steden'}
          </p>
          {gaoMessage && (
            <p className="text-[10px] text-inkBlack/40 italic mt-0.5">{gaoMessage}</p>
          )}
        </div>
        <p className="text-xs font-black text-inkBlack/30 shrink-0">Open →</p>
      </div>
    </button>
  )
}
