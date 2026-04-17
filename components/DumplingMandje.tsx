'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Icon from './Icon'
import { createClient, signInWithGoogle, signOut } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

interface CheckInRecord {
  restaurantId: string
  restaurantName: string
  city: string
  rating: 'fire' | 'solid' | 'meh'
  date: string
  note?: string
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
}

function gaoMessage(total: number, cities: number): string {
  if (total === 0) return 'Gao wacht op je eerste dumpling'
  if (cities >= 5) return 'Gao ziet dat je op grote ontdekkingstocht bent'
  if (cities >= 3) return 'Gao ziet dat je op ontdekkingstocht bent'
  if (total >= 25) return 'Gao buigt diep voor jouw toewijding'
  if (total >= 15) return 'Gao is onder de indruk'
  if (total >= 10) return 'Gao begint je smaak te vertrouwen'
  if (total >= 5) return 'Gao ziet dat je serieus bent'
  if (total >= 3) return 'Gao begint je te kennen'
  if (total >= 1) return 'De reis is begonnen'
  return 'Gao wacht op je eerste dumpling'
}

function milestoneProgress(total: number): { prev: number; next: number; pct: number } {
  const milestones = [0, 1, 3, 5, 10, 15, 25, 50]
  const nextIdx = milestones.findIndex(m => m > total)
  const prev = milestones[nextIdx - 1] ?? 0
  const next = milestones[nextIdx] ?? total + 25
  const pct = Math.round(((total - prev) / (next - prev)) * 100)
  return { prev, next, pct }
}

function getBadges(checkins: CheckInRecord[]): Badge[] {
  const cities = new Set(checkins.map(c => c.city))
  const fireCount = checkins.filter(c => c.rating === 'fire').length
  const total = checkins.length

  const restaurantCounts = checkins.reduce((acc, c) => {
    acc[c.restaurantId] = (acc[c.restaurantId] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const hasVastePrik = Object.values(restaurantCounts).some(count => count >= 3)

  const firstCity = checkins[0]?.city ?? null
  const hasOntdekker = firstCity !== null && Array.from(cities).some(c => c !== firstCity)

  return [
    { id: 'first', name: 'Eerste Dumpling', description: 'De reis begint', icon: 'dumpling-sparkle.png', unlocked: total >= 1 },
    { id: 'explorer', name: 'Dim Sum Explorer', description: '3 restaurants bezocht', icon: 'dumpling-group.png', unlocked: total >= 3 },
    { id: 'city_hopper', name: 'Stad Hopper', description: 'Dim sum in 2 steden', icon: 'dumpling-pin.png', unlocked: cities.size >= 2 },
    { id: 'op_smaak', name: 'Op Smaak', description: '3× On fire rating', icon: 'flame.png', unlocked: fireCount >= 3 },
    { id: 'vaste_prik', name: 'Vaste Prik', description: '3× zelfde restaurant', icon: 'dumpling-check.png', unlocked: hasVastePrik },
    { id: 'ontdekker', name: 'Ontdekker', description: 'Eerste stad buiten je startstad', icon: 'dumpling-pin.png', unlocked: hasOntdekker },
    { id: 'reiziger', name: 'Dim Sum Reiziger', description: '5 steden ontdekt', icon: 'dumpling-group.png', unlocked: cities.size >= 5 },
    { id: 'kenner', name: 'Echte Kenner', description: '15 restaurants bezocht', icon: 'dumpling-crown.png', unlocked: total >= 15 },
    { id: 'meester', name: 'Dim Sum Meester', description: 'Gao buigt voor jou', icon: 'dumpling-crown.png', unlocked: total >= 25 },
  ]
}

export default function DumplingMandje() {
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Load checkins from localStorage
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

  // Auth state
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Migrate anonymous checkins once on login
  useEffect(() => {
    if (!user) return

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
        } catch { /* skip */ }
      }
    }

    if (records.length === 0) return

    const migrated = localStorage.getItem('checkins_migrated')
    if (migrated) return

    console.debug(`[Mandje] Migrating ${records.length} anonymous checkins to account`)
    localStorage.setItem('checkins_migrated', 'true')
    // Checkins are already in Supabase with ip_hash; future checkins will carry user_id
  }, [user])

  const badges = getBadges(checkins)
  const unlockedCount = badges.filter(b => b.unlocked).length
  const cities = new Set(checkins.map(c => c.city))

  if (checkins.length === 0) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm transition-all"
      >
        <Icon
          src={checkins.length > 0 ? 'basket-full.png' : 'basket-empty.png'}
          alt="Dumpling Mandje"
          size={48}
        />
        <div className="text-left flex-1">
          <p className="font-black text-sm">Mijn Dumpling Mandje</p>
          <p className="text-xs text-inkBlack/50">
            {checkins.length} {checkins.length === 1 ? 'bezoek' : 'bezoeken'} · {cities.size} {cities.size === 1 ? 'stad' : 'steden'} · {unlockedCount}/{badges.length} badges
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-inkBlack/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full bg-cream rounded-t-3xl border-t-[3px] border-inkBlack px-5 pt-4 pb-10 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-inkBlack/20 rounded-full mx-auto mb-4" />

            {(() => {
              const { next, pct } = milestoneProgress(checkins.length)
              return (
                <div className="mb-5 p-4 rounded-2xl bg-inkBlack text-cream">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src="/mascots/GaoMandje.png" alt="Gao" width={48} height={48} className="object-contain shrink-0" />
                    <div>
                      <p className="font-black text-base leading-tight">
                        {checkins.length} {checkins.length === 1 ? 'dumpling' : 'dumplings'} verzameld
                      </p>
                      <p className="text-xs text-cream/60 mt-0.5 italic">
                        {gaoMessage(checkins.length, cities.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-center flex-1">
                      <p className="text-2xl font-black text-cream leading-none">{checkins.length}</p>
                      <p className="text-[9px] text-cream/40 font-bold uppercase tracking-wide mt-0.5">bezoeken</p>
                    </div>
                    <div className="w-px h-8 bg-cream/20" />
                    <div className="text-center flex-1">
                      <p className="text-2xl font-black text-cream leading-none">{cities.size}</p>
                      <p className="text-[9px] text-cream/40 font-bold uppercase tracking-wide mt-0.5">steden</p>
                    </div>
                    <div className="w-px h-8 bg-cream/20" />
                    <div className="text-center flex-1">
                      <p className="text-2xl font-black text-cream leading-none">{unlockedCount}</p>
                      <p className="text-[9px] text-cream/40 font-bold uppercase tracking-wide mt-0.5">badges</p>
                    </div>
                  </div>

                  {checkins.length > 0 && checkins.length < 50 && (
                    <div className="pt-3 border-t border-cream/10">
                      <p className="text-[10px] text-cream/40 text-center mb-1.5">
                        Volgende mijlpaal: {next} dumplings
                      </p>
                      <div className="h-1.5 bg-cream/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-epicGold rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Login section */}
            {!user ? (
              <div className="mb-4 p-3 rounded-xl bg-inkBlack/5 border border-inkBlack/10">
                <p className="text-xs font-black text-inkBlack mb-1">
                  Bewaar je mandje permanent
                </p>
                <p className="text-[10px] text-inkBlack/50 mb-3 leading-snug">
                  Log in zodat je bezoeken en badges nooit verloren gaan —
                  ook niet als je cookies wist.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-inkBlack rounded-xl text-xs font-black shadow-brutal-sm active:scale-95 transition-transform"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Inloggen met Google
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url as string}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full border border-inkBlack/20"
                    />
                  )}
                  <p className="text-[10px] text-inkBlack/50">
                    {(user.user_metadata?.name as string) ?? user.email}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="text-[10px] text-inkBlack/30 font-bold hover:text-inkBlack/60 transition-colors"
                >
                  Uitloggen
                </button>
              </div>
            )}

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
                  <Icon
                    src={badge.icon}
                    alt={badge.name}
                    size={badge.unlocked ? 32 : 28}
                    className="mb-1"
                  />
                  <p className="text-[10px] font-black text-inkBlack leading-tight">{badge.name}</p>
                  <p className="text-[9px] text-inkBlack/40 leading-tight mt-0.5">{badge.description}</p>
                </div>
              ))}
            </div>

            {/* Recent visits */}
            <p className="font-black text-xs uppercase tracking-wide text-inkBlack/40 mb-2">Recente bezoeken uit jouw mandje</p>
            <div className="space-y-2 mb-4">
              {checkins.slice(-5).reverse().map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-inkBlack/10">
                  <Icon
                    src={c.rating === 'fire' ? 'flame.png' : c.rating === 'solid' ? 'dumpling-check.png' : 'dumpling-meh.png'}
                    alt={c.rating}
                    size={18}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{c.restaurantName}</p>
                    <p className="text-[10px] text-inkBlack/40">{c.city}</p>
                    {c.note && (
                      <p className="text-[10px] text-inkBlack/50 italic mt-1.5 pl-6 leading-snug line-clamp-2">
                        &ldquo;{c.note}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setIsOpen(false)} className="w-full py-3 bg-epicRed text-cream font-black rounded-2xl border-2 border-inkBlack shadow-brutal-sm text-sm">
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  )
}
