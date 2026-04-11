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

  const submittedOption = options.find(o => o.value === submitted)

  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white">

      {/* Already submitted */}
      {submitted && submittedOption ? (
        <div className="text-center">
          <Mascot type={submittedOption.gao} size={56} className="mx-auto mb-2" />
          <p className="font-black text-sm">Check-in opgeslagen! 🥟</p>
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
