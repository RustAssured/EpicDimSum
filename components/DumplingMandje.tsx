'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Mascot from './Mascot'

interface CheckInRecord {
  restaurantId: string
  restaurantName: string
  city: string
  rating: 'fire' | 'solid' | 'epic'
  date: string
  journalNote?: string
}

interface Badge {
  id: string
  name: string
  description: string
  emoji: string
  unlocked: boolean
}

function getBadges(checkins: CheckInRecord[]): Badge[] {
  const cities = new Set(checkins.map(c => c.city))
  const fireCount = checkins.filter(c => c.rating === 'fire').length
  const total = checkins.length

  return [
    {
      id: 'first',
      name: 'Eerste Dumpling',
      description: 'Je eerste check-in',
      emoji: '🥟',
      unlocked: total >= 1,
    },
    {
      id: 'explorer',
      name: 'Dim Sum Explorer',
      description: '3 verschillende restaurants',
      emoji: '🗺️',
      unlocked: total >= 3,
    },
    {
      id: 'city_hopper',
      name: 'Stad Hopper',
      description: 'Dim sum in 2 steden',
      emoji: '🏙️',
      unlocked: cities.size >= 2,
    },
    {
      id: 'connaisseur',
      name: 'Ha Gao Connaisseur',
      description: '3× "On fire" rating',
      emoji: '🔥',
      unlocked: fireCount >= 3,
    },
    {
      id: 'reiziger',
      name: 'Dim Sum Reiziger',
      description: 'Dim sum in 3 steden',
      emoji: '✈️',
      unlocked: cities.size >= 3,
    },
    {
      id: 'meester',
      name: 'Dim Sum Meester',
      description: '10 restaurants bezocht',
      emoji: '👑',
      unlocked: total >= 10,
    },
  ]
}

export default function DumplingMandje() {
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const records: CheckInRecord[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('checkin_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data)
            if (parsed.restaurantId) records.push(parsed)
          }
        } catch { /* skip malformed */ }
      }
    }
    setCheckins(records)
  }, [isOpen])

  const badges = getBadges(checkins)
  const unlockedCount = badges.filter(b => b.unlocked).length
  const cities = new Set(checkins.map(c => c.city))

  if (checkins.length === 0) {
    return (
      <div className="w-full rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] p-4 mb-1">
        <div className="flex items-center gap-3">
          <Image src="/mascots/GaoMandje.png" alt="Dim Sum Reis" width={48} height={48} className="object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight">Je mandje is nog leeg</p>
            <p className="text-xs text-inkBlack/50 mt-0.5 leading-snug">Eet eerst, check dan in bij je favoriete spot</p>
          </div>
          <p className="text-xs font-black text-inkBlack/30 shrink-0">Bekijk Gao's plekken →</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] active:translate-x-[2px] active:translate-y-[2px] active:shadow-brutal-sm transition-all"
      >
        <Mascot type="happy" size={40} />
        <div className="text-left flex-1">
          <p className="font-black text-sm">Mijn Dumpling Mandje 🧺</p>
          <p className="text-xs text-inkBlack/50">
            {checkins.length} {checkins.length === 1 ? 'bezoek' : 'bezoeken'} · {cities.size} {cities.size === 1 ? 'stad' : 'steden'} · {unlockedCount}/{badges.length} badges
          </p>
        </div>
        <span className="text-xl">🧺</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-inkBlack/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full bg-cream rounded-t-3xl border-t-[3px] border-inkBlack px-5 pt-4 pb-10 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-inkBlack/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-3 mb-5">
              <Mascot type="top1" size={48} />
              <div>
                <h2 className="font-black text-lg">Mijn Dumpling Mandje 🧺</h2>
                <p className="text-xs text-inkBlack/40">
                  {checkins.length} spots · {cities.size} steden · {unlockedCount} badges
                </p>
              </div>
            </div>

            {/* Badges */}
            <p className="font-black text-xs uppercase tracking-wide text-inkBlack/40 mb-2">Jouw badges</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {badges.map(badge => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 text-center ${
                    badge.unlocked
                      ? 'bg-white border-inkBlack shadow-brutal-sm'
                      : 'bg-inkBlack/5 border-inkBlack/10 opacity-40'
                  }`}
                >
                  <span className="text-2xl mb-1">{badge.emoji}</span>
                  <p className="text-[10px] font-black text-inkBlack leading-tight">{badge.name}</p>
                  <p className="text-[9px] text-inkBlack/40 leading-tight mt-0.5">{badge.description}</p>
                </div>
              ))}
            </div>

            {/* Recent check-ins */}
            <p className="font-black text-xs uppercase tracking-wide text-inkBlack/40 mb-2">Recente bezoeken uit jouw mandje</p>
            <div className="space-y-2">
              {checkins.slice(-5).reverse().map((c, i) => (
                <div key={i} className="p-2.5 bg-white rounded-xl border border-inkBlack/10">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.rating === 'epic' ? '🥟' : c.rating === 'fire' ? '🔥' : '👍'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{c.restaurantName}</p>
                      <p className="text-[10px] text-inkBlack/40">{c.city}</p>
                    </div>
                  </div>
                  {c.journalNote && c.journalNote.trim() !== '' && (
                    <p className="mt-1.5 pl-7 text-[12px] text-inkBlack/50 italic leading-snug">
                      📝 {c.journalNote}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 py-3 bg-epicRed text-cream font-black rounded-2xl border-2 border-inkBlack shadow-brutal-sm text-sm active:translate-y-[2px] active:shadow-none transition-all"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  )
}
