'use client'
import { useState, useEffect } from 'react'
import Mascot from './Mascot'
import Icon from './Icon'
import Image from 'next/image'
import { createClient, signInWithGoogle } from '@/lib/auth'

interface CheckInProps {
  restaurantId: string
  restaurantName: string
  restaurantCity: string
}

type Rating = 'solid' | 'fire' | 'epic'

interface Summary {
  fire: number
  solid: number
  epic: number
  total: number
}

const options: { value: Rating; label: string; icon: string; size: number }[] = [
  { value: 'solid', label: 'Solide 👍', icon: 'Dumpling-check.png', size: 32 },
  { value: 'fire', label: 'Top 🔥', icon: 'flame.png', size: 32 },
  { value: 'epic', label: 'Episch 🥟', icon: 'Ha-Gao-star.png', size: 32 },
]

function RatingSummary({ summary }: { summary: Summary }) {
  return (
    <span className="inline-flex items-center gap-1 flex-wrap justify-center">
      {summary.epic > 0 && (
        <span className="inline-flex items-center gap-0.5">
          · <Icon src="Ha-Gao-star.png" alt="episch" size={14} /> {summary.epic}
        </span>
      )}
      {summary.fire > 0 && (
        <span className="inline-flex items-center gap-0.5">
          · <Icon src="flame.png" alt="fire" size={14} /> {summary.fire}
        </span>
      )}
      {summary.solid > 0 && (
        <span className="inline-flex items-center gap-0.5">
          · <Icon src="dumpling-check.png" alt="solid" size={14} /> {summary.solid}
        </span>
      )}
    </span>
  )
}

export default function CheckIn({ restaurantId, restaurantName, restaurantCity }: CheckInProps) {
  const [submitted, setSubmitted] = useState<Rating | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const [showExtras, setShowExtras] = useState(false)
  const [compliment, setCompliment] = useState('')
  const [journalNote, setJournalNote] = useState('')
  const [savingExtras, setSavingExtras] = useState(false)
  const [extrasDone, setExtrasDone] = useState(false)
  const [extrasThanked, setExtrasThanked] = useState(false)

  useEffect(() => {
    fetch(`/api/checkin?restaurantId=${restaurantId}`)
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(() => {})

    const stored = localStorage.getItem(`checkin_${restaurantId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const storedRating = parsed.rating ?? (stored as Rating)
        if (storedRating) {
          setSubmitted(storedRating)
          if (parsed.extrasDone) {
            setExtrasDone(true)
          } else {
            setShowExtras(true)
          }
        }
      } catch {
        setSubmitted(stored as Rating)
      }
    }
  }, [restaurantId])

  const handleCheckIn = async (rating: Rating) => {
    if (submitted || loading || alreadyCheckedIn) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ restaurantId, rating }),
      })
      const data = await res.json()

      if (data.alreadyCheckedIn) {
        setAlreadyCheckedIn(true)
        setSummary(data.summary)
        return
      }

      if (data.success) {
        setSubmitted(rating)
        setSummary(data.summary)
        setShowExtras(true)
        localStorage.setItem(`checkin_${restaurantId}`, JSON.stringify({
          restaurantId,
          restaurantName,
          city: restaurantCity,
          rating,
          date: new Date().toISOString(),
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const persistExtrasDone = (note: string) => {
    const stored = localStorage.getItem(`checkin_${restaurantId}`)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      parsed.extrasDone = true
      if (note) parsed.journalNote = note
      localStorage.setItem(`checkin_${restaurantId}`, JSON.stringify(parsed))
    } catch { /* ignore */ }
  }

  const handleSaveExtras = async () => {
    const trimmedCompliment = compliment.trim()
    const trimmedNote = journalNote.trim()
    const hasContent = trimmedCompliment.length > 0 || trimmedNote.length > 0

    if (!hasContent) {
      setShowExtras(false)
      setExtrasDone(true)
      persistExtrasDone('')
      return
    }

    setSavingExtras(true)
    try {
      const tasks: Promise<unknown>[] = []
      if (trimmedCompliment) {
        tasks.push(fetch('/api/compliment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId, text: trimmedCompliment }),
        }))
      }
      if (trimmedNote) {
        tasks.push(fetch(`/api/checkin/${restaurantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journalNote: trimmedNote }),
        }))
      }
      await Promise.all(tasks)
      persistExtrasDone(trimmedNote)
      setExtrasThanked(true)
      setShowExtras(false)
      setExtrasDone(true)
    } finally {
      setSavingExtras(false)
    }
  }

  const handleSkipExtras = () => {
    setShowExtras(false)
    setExtrasDone(true)
    persistExtrasDone('')
  }

  const submittedOption = options.find(o => o.value === submitted)
  const submittedGao = submitted === 'solid' ? 'happy' : 'hilarischgao'

  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white">

      {submitted && submittedOption ? (
        <div>
          <div className="text-center">
            <Mascot type={submittedGao} size={56} className="mx-auto mb-2" />
            <p className="font-black text-sm">🥟 Je bent hier geweest!</p>
            <p className="text-xs text-inkBlack/40 mt-0.5">{restaurantName}</p>
            {summary && summary.total > 0 && (
              <p className="text-xs text-inkBlack/50 mt-2">
                {summary.total} {summary.total === 1 ? 'bezoeker' : 'bezoekers'} via EpicDimSum
                {summary.epic > 0 && ` · ${summary.epic}🥟`}
                {summary.fire > 0 && ` · ${summary.fire}🔥`}
                {summary.solid > 0 && ` · ${summary.solid}👍`}
              </p>
            )}
          </div>

          {showExtras && !extrasDone && (
            <div className="mt-4 pt-4 border-t-2 border-inkBlack/10 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1.5">
                  Wat was epic?
                </label>
                <textarea
                  value={compliment}
                  onChange={(e) => setCompliment(e.target.value.slice(0, 140))}
                  maxLength={140}
                  placeholder="bijv: perfecte ha gao, super dun velletje"
                  className="w-full p-3 rounded-2xl border-2 border-inkBlack/20 bg-cream text-sm focus:border-inkBlack focus:outline-none resize-none"
                  rows={2}
                />
                <p className="text-[10px] text-inkBlack/40 text-right mt-0.5">{compliment.length}/140 · zichtbaar voor iedereen</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1.5">
                  📝 Notitie voor jezelf (alleen voor jou)
                </label>
                <textarea
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value.slice(0, 280))}
                  maxLength={280}
                  placeholder="bijv: volgende keer die rice rolls proberen"
                  className="w-full p-3 rounded-2xl border-2 border-inkBlack/20 bg-cream text-sm focus:border-inkBlack focus:outline-none resize-none"
                  rows={3}
                />
                <p className="text-[10px] text-inkBlack/40 text-right mt-0.5">{journalNote.length}/280 · alleen voor jou</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleSkipExtras}
                  disabled={savingExtras}
                  className="text-xs font-bold text-inkBlack/50 underline underline-offset-2 disabled:opacity-50"
                >
                  Sla over
                </button>
                <button
                  onClick={handleSaveExtras}
                  disabled={savingExtras}
                  className="px-5 py-2 bg-epicRed text-cream font-black rounded-2xl border-2 border-inkBlack shadow-brutal-sm text-sm active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {savingExtras ? 'Opslaan…' : 'Bewaar'}
                </button>
              </div>
            </div>
          )}

          {extrasDone && extrasThanked && (
            <p className="mt-3 text-center text-xs text-inkBlack/50 italic">
              Dank je! Gao onthoudt het. 🥟
            </p>
          )}
        </div>

      ) : alreadyCheckedIn ? (
        <div className="text-center">
          <Mascot type="judge" size={44} className="mx-auto mb-2" />
          <p className="font-black text-sm">Je was hier al! 🥟</p>
          <p className="text-xs text-inkBlack/40 mt-0.5">Je kan één keer per dag inchecken</p>
        </div>

      ) : !user ? (
        <div className="text-center py-2">
          <Image
            src="/mascots/votegao.png"
            alt="Login om in te checken"
            width={56}
            height={56}
            className="object-contain mx-auto mb-3"
          />
          <p className="font-black text-sm mb-1">
            Bouw jouw Dim Sum Mandje 🧺
          </p>
          <p className="text-xs text-inkBlack/50 mb-1 leading-snug">
            Check in bij dim sum spots, verzamel badges
            en ga met Gao op reis door Nederland.
          </p>
          <p className="text-[10px] text-inkBlack/30 mb-3">
            Inloggen duurt 5 seconden.
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
            Ga op reis met Gao →
          </button>
        </div>

      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/mascots/votegao.png"
              alt="Gao vote"
              width={48}
              height={48}
              className="object-contain shrink-0"
            />
            <div>
              <p className="font-black text-sm leading-tight">Geweest? Check in!</p>
              <p className="text-xs text-inkBlack/40 leading-tight mt-0.5">
                Vond je het goed? Zeg het!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCheckIn(opt.value)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${
                  submitted === opt.value
                    ? 'bg-inkBlack border-inkBlack'
                    : 'bg-cream border-inkBlack/20 hover:border-inkBlack/40'
                }`}
              >
                <Image
                  src={`/mascots/${opt.icon}`}
                  alt={opt.label}
                  width={opt.size}
                  height={opt.size}
                  className="object-contain"
                />
                <span className={`text-[9px] font-black leading-none ${
                  submitted === opt.value ? 'text-cream' : 'text-inkBlack/50'
                }`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {summary && summary.total > 0 && (
            <p className="text-[10px] text-inkBlack/30 text-center mt-3 inline-flex items-center gap-1 w-full justify-center flex-wrap">
              {summary.total} {summary.total === 1 ? 'bezoeker' : 'bezoekers'} checkte al in
              <RatingSummary summary={summary} />
            </p>
          )}
        </>
      )}
    </div>
  )
}
