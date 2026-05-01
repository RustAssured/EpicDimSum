'use client'
import { useState, useEffect } from 'react'
import Mascot from './Mascot'
import Image from 'next/image'

interface CheckInProps {
  restaurantId: string
  restaurantName: string
  restaurantCity: string
}

type Rating = 'fire' | 'solid' | 'meh'

interface Summary {
  fire: number
  solid: number
  meh: number
  total: number
}

const options: {
  value: Rating
  label: string
  emoji: string
  gao: 'hilarischgao' | 'happy' | 'upsetsteaminggao'
  bg: string
  border: string
}[] = [
  { value: 'fire', label: 'On fire!', emoji: '🔥', gao: 'hilarischgao', bg: 'bg-epicRed/8', border: 'border-epicRed/30' },
  { value: 'solid', label: 'Solide', emoji: '👍', gao: 'happy', bg: 'bg-epicGreen/8', border: 'border-epicGreen/30' },
  { value: 'meh', label: 'Mwah...', emoji: '😐', gao: 'upsetsteaminggao', bg: 'bg-inkBlack/5', border: 'border-inkBlack/20' },
]

export default function CheckIn({ restaurantId, restaurantName, restaurantCity }: CheckInProps) {
  const [submitted, setSubmitted] = useState<Rating | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

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
        setSubmitted(parsed.rating ?? stored as Rating)
        if (parsed.extrasDone) setExtrasDone(true)
      } catch {
        setSubmitted(stored as Rating) // backwards compat
      }
    }
  }, [restaurantId])

  const handleCheckIn = async (rating: Rating) => {
    if (submitted || loading || alreadyCheckedIn) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white">

      {/* Already submitted */}
      {submitted && submittedOption ? (
        <div>
          <div className="text-center">
            <Mascot type={submittedOption.gao} size={56} className="mx-auto mb-2" />
            <p className="font-black text-sm">🥟 Je bent hier geweest!</p>
            <p className="text-xs text-inkBlack/40 mt-0.5">{restaurantName}</p>
            {summary && summary.total > 0 && (
              <p className="text-xs text-inkBlack/50 mt-2">
                {summary.total} {summary.total === 1 ? 'bezoeker' : 'bezoekers'} via EpicDimSum
                {summary.fire > 0 && ` · ${summary.fire}🔥`}
                {summary.solid > 0 && ` · ${summary.solid}👍`}
                {summary.meh > 0 && ` · ${summary.meh}😐`}
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
                  placeholder="Vertel het andere dim sum liefhebbers..."
                  className="w-full p-3 rounded-2xl border-2 border-inkBlack/20 bg-cream text-sm focus:border-inkBlack focus:outline-none resize-none"
                  rows={2}
                />
                <p className="text-[10px] text-inkBlack/40 text-right mt-0.5">{compliment.length}/140 · zichtbaar voor iedereen</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1.5">
                  📝 Notitie voor jezelf
                </label>
                <textarea
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value.slice(0, 280))}
                  maxLength={280}
                  placeholder="Onthoud wat je at, hoe het smaakte..."
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

      ) : (
        <>
          {/* Header with votegao */}
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/mascots/votegao.png"
              alt="Gao vote"
              width={48}
              height={48}
              className="object-contain shrink-0"
            />
            <div>
              <p className="font-black text-sm leading-tight">Ben je hier geweest?</p>
              <p className="text-xs text-inkBlack/40 leading-tight mt-0.5">
                Jouw oordeel helpt andere dim sum liefhebbers
              </p>
            </div>
          </div>

          {/* Rating buttons */}
          <div className="grid grid-cols-3 gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCheckIn(opt.value)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 ${opt.bg} ${opt.border} hover:border-inkBlack transition-all active:scale-95 disabled:opacity-50`}
              >
                <Mascot type={opt.gao} size={36} />
                <span className="text-[10px] font-black text-inkBlack/60 leading-none text-center">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Existing summary */}
          {summary && summary.total > 0 && (
            <p className="text-[10px] text-inkBlack/30 text-center mt-3">
              {summary.total} {summary.total === 1 ? 'bezoeker' : 'bezoekers'} checkte al in
              {summary.fire > 0 && ` · ${summary.fire}🔥`}
              {summary.solid > 0 && ` · ${summary.solid}👍`}
              {summary.meh > 0 && ` · ${summary.meh}😐`}
            </p>
          )}
        </>
      )}
    </div>
  )
}
