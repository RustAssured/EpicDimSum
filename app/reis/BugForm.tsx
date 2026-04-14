'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function BugForm() {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() || loading) return
    setLoading(true)
    try {
      await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-2">
        <Image src="/mascots/happy.png" alt="Gao blij" width={40} height={40} className="object-contain mx-auto mb-2" />
        <p className="text-xs font-black text-epicGreen">Gao heeft het ontvangen!</p>
        <p className="text-[10px] text-inkBlack/40 mt-0.5">Bedankt voor je hulp op de reis 🥟</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Wat heb je gevonden? Een fout, een suggestie, of gewoon iets wat niet klopt..."
        rows={3}
        className="w-full text-xs p-3 rounded-xl border-2 border-inkBlack/20 bg-white focus:outline-none focus:border-epicPurple/50 resize-none leading-relaxed"
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || loading}
        className="w-full py-2.5 bg-epicPurple text-cream font-black rounded-xl border-2 border-inkBlack text-xs shadow-brutal-sm active:scale-95 transition-transform disabled:opacity-50"
      >
        {loading ? 'Gao ontvangt...' : 'Help Gao verder bouwen →'}
      </button>
    </div>
  )
}
