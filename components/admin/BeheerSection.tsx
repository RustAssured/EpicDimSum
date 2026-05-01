'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Mascot from '@/components/Mascot'

interface BeheerSectionProps {
  secret: string
}

interface AgentResult {
  mode?: string
  checked?: number
  flagged?: number
  removed?: number
  skipped?: boolean
  reason?: string
  results?: Array<{
    name: string
    verdict: string
    confidence: number
    reasoning: string
  }>
}

interface FeedbackItem {
  id: string
  message: string
  status: string
  created_at: string
}

const AGENT_MODE_PREF_KEY = 'admin_agent_mode_preference'

const NL_CITIES = [
  'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven',
  'Groningen', 'Leeuwarden', 'Assen', 'Zwolle', 'Arnhem',
  'Maastricht', 'Middelburg', 'Lelystad', "'s-Hertogenbosch",
]

function humanizeError(error: string): string {
  if (error === 'Unauthorized') return 'Verkeerd wachtwoord, check je Sync Secret'
  return error
}

export default function BeheerSection({ secret }: BeheerSectionProps) {
  // Agent state
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null)
  const [agentModePref, setAgentModePref] = useState<'flag' | 'autonomous'>('flag')
  const [pendingMode, setPendingMode] = useState<'flag' | 'autonomous' | null>(null)

  // NL scan
  const [scanRunning, setScanRunning] = useState(false)
  const [scanStatus, setScanStatus] = useState<string | null>(null)

  // Feedback
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(AGENT_MODE_PREF_KEY)
      if (stored === 'flag' || stored === 'autonomous') {
        setAgentModePref(stored)
      }
    }
  }, [])

  useEffect(() => {
    if (!secret) return
    setFeedbackLoading(true)
    fetch('/api/admin/feedback', {
      headers: { 'x-sync-secret': secret },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setFeedback(data)
      })
      .catch(() => {})
      .finally(() => setFeedbackLoading(false))
  }, [secret])

  const handleRunAgent = async () => {
    if (!secret) return
    setAgentRunning(true)
    try {
      const res = await fetch('/api/agent/audit', {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      const data = await res.json()
      setAgentResult(data)
    } finally {
      setAgentRunning(false)
    }
  }

  const requestModeChange = (next: 'flag' | 'autonomous') => {
    if (next === agentModePref) return
    setPendingMode(next)
  }

  const confirmModeChange = () => {
    if (!pendingMode) return
    setAgentModePref(pendingMode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AGENT_MODE_PREF_KEY, pendingMode)
    }
    setPendingMode(null)
  }

  const cancelModeChange = () => setPendingMode(null)

  const handleFullScan = async () => {
    if (!secret) return
    setScanRunning(true)
    setScanStatus('Gestart...')

    let totalAdded = 0

    for (const city of NL_CITIES) {
      setScanStatus(`Scanning ${city}...`)
      try {
        const res = await fetch(
          `/api/admin/full-scan?city=${encodeURIComponent(city)}`,
          {
            method: 'POST',
            headers: { 'x-sync-secret': secret },
            signal: AbortSignal.timeout(30000),
          }
        )
        if (res.ok) {
          const data = await res.json()
          totalAdded += data.added ?? 0
          setScanStatus(`${city} ✓, ${totalAdded} nieuw totaal`)
        } else {
          setScanStatus(`${city} overgeslagen, doorgaan...`)
        }
      } catch {
        setScanStatus(`${city} timeout, doorgaan...`)
      }
      await new Promise((r) => setTimeout(r, 1500))
    }

    setScanStatus(`✓ Klaar! ${totalAdded} nieuwe restaurants gevonden`)
    setScanRunning(false)
  }

  const markFeedbackDone = async (id: string) => {
    try {
      await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': secret,
        },
        body: JSON.stringify({ id, status: 'done' }),
      })
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'done' } : f))
      )
    } catch {
      /* skip */
    }
  }

  const currentRunMode = agentResult?.mode

  return (
    <div className="space-y-6">
      {/* Quality Agent */}
      <div className="p-4 rounded-2xl border-[3px] border-epicPurple/40 bg-epicPurple/5 shadow-[4px_4px_0px_rgba(83,74,183,0.3)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mascot type="judge" size={32} />
            <div>
              <p className="font-black text-sm">Kwaliteitsagent</p>
              <p className="text-[11px] text-inkBlack/60">
                Mode (laatste run):{' '}
                <span className="font-black">
                  {currentRunMode ? currentRunMode : 'onbekend — run om te zien'}
                </span>
              </p>
              <p className="text-[10px] text-inkBlack/40">
                Voorkeur: <span className="font-bold">{agentModePref === 'autonomous' ? 'Autonoom' : 'Vlagmodus'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleRunAgent}
            disabled={agentRunning}
            className="text-xs font-black px-3 py-2 rounded-full bg-epicPurple text-cream border-2 border-inkBlack shadow-brutal-sm disabled:opacity-50"
          >
            {agentRunning ? '🔍 Bezig...' : '▶ Run nu'}
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mt-3 p-3 rounded-xl bg-white border-2 border-epicPurple/30 space-y-2">
          <p className="text-xs font-black text-inkBlack">Modus voorkeur</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={() => requestModeChange('flag')}
              className={`flex-1 text-left p-2.5 rounded-lg border-2 transition-all ${
                agentModePref === 'flag'
                  ? 'border-inkBlack bg-epicGreen/10'
                  : 'border-inkBlack/20 bg-cream hover:border-inkBlack/40'
              }`}
            >
              <p className="text-xs font-black text-inkBlack">🚩 Vlagmodus</p>
              <p className="text-[10px] text-inkBlack/50 mt-0.5">
                Agent markeert voor review. Geen auto-verwijderingen.
              </p>
            </button>
            <button
              onClick={() => requestModeChange('autonomous')}
              className={`flex-1 text-left p-2.5 rounded-lg border-2 transition-all ${
                agentModePref === 'autonomous'
                  ? 'border-inkBlack bg-epicRed/10'
                  : 'border-inkBlack/20 bg-cream hover:border-inkBlack/40'
              }`}
            >
              <p className="text-xs font-black text-inkBlack">⚠️ Autonome modus</p>
              <p className="text-[10px] text-inkBlack/50 mt-0.5">
                Agent past zelf aan zonder review.
              </p>
            </button>
          </div>
          <p className="text-[10px] text-inkBlack/40 italic">
            Voorkeur wordt lokaal opgeslagen. De daadwerkelijke server-modus wordt na de volgende run getoond.
          </p>
        </div>

        {pendingMode && (
          <div className="mt-3 p-3 rounded-xl bg-epicGold/10 border-2 border-epicGold space-y-2">
            <p className="text-xs font-bold text-inkBlack">
              Weet je zeker dat je naar{' '}
              <span className="font-black">
                {pendingMode === 'autonomous' ? 'Autonome modus' : 'Vlagmodus'}
              </span>{' '}
              wilt schakelen?
            </p>
            {pendingMode === 'autonomous' && (
              <p className="text-[10px] text-epicRed font-bold">
                Let op: in autonome modus kan de agent restaurants permanent verwijderen.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmModeChange}
                className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-epicPurple text-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Bevestigen
              </button>
              <button
                onClick={cancelModeChange}
                className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream text-inkBlack active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {agentResult && !agentResult.skipped && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-bold">
              Mode: <span className="text-epicPurple">{agentResult.mode}</span>
              {' · '}Gecheckt: {agentResult.checked}
              {' · '}Geflagd: {agentResult.flagged}
              {(agentResult.removed ?? 0) > 0 && ` · Verwijderd: ${agentResult.removed}`}
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
              {agentResult.results?.map((r, i) => (
                <div
                  key={i}
                  className={`text-[10px] px-2 py-1 rounded-lg ${
                    r.verdict === 'remove'
                      ? 'bg-red-50 text-red-600'
                      : r.verdict === 'flag'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  <span className="font-black">{r.name}</span>
                  {' '}({r.confidence}%)
                  {' '}{r.reasoning}
                </div>
              ))}
            </div>
          </div>
        )}
        {agentResult?.skipped && (
          <p className="text-xs text-inkBlack/40 mt-1">{agentResult.reason}</p>
        )}
      </div>

      {/* Scan NL */}
      <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4 space-y-3">
        <div>
          <p className="font-black text-sm text-inkBlack">Scan NL</p>
          <p className="text-[11px] text-inkBlack/50 mt-0.5">
            Zoekt nieuwe dim-sum spots in alle steden.
          </p>
        </div>
        <button
          onClick={handleFullScan}
          disabled={scanRunning}
          className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
            ${scanRunning
              ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
              : 'bg-epicGreen text-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
            }`}
        >
          {scanRunning ? '⏳ Alle steden scannen...' : '🌍 Scan heel Nederland'}
        </button>
        {scanStatus && (
          <p className="text-xs font-bold text-inkBlack/60">{scanStatus}</p>
        )}
      </div>

      {/* Feedback */}
      <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
        <div className="p-4 border-b-[2px] border-inkBlack/10 bg-epicRed/5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-inkBlack">💬 Feedback</h2>
            <p className="text-xs text-inkBlack/50 mt-0.5">
              {feedback.filter((f) => f.status === 'open').length} openstaand
            </p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {feedbackLoading && (
            <p className="text-center text-xs text-inkBlack/40 py-4">Gao laadt feedback...</p>
          )}

          {!feedbackLoading && feedback.length === 0 && (
            <div className="text-center py-8">
              <Image
                src="/mascots/sleepy.png"
                alt=""
                width={48}
                height={48}
                className="object-contain mx-auto mb-3 opacity-40"
              />
              <p className="text-xs text-inkBlack/40">Nog geen feedback ontvangen</p>
            </div>
          )}

          {!feedbackLoading &&
            feedback.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border-2 ${
                  item.status === 'open'
                    ? 'border-epicRed/30 bg-epicRed/5'
                    : 'border-inkBlack/10 bg-white opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-xs text-inkBlack/70 leading-relaxed flex-1">
                    {item.message}
                  </p>
                  <button
                    onClick={() => markFeedbackDone(item.id)}
                    className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${
                      item.status === 'open'
                        ? 'border-epicGreen/40 text-epicGreen hover:bg-epicGreen/10'
                        : 'border-inkBlack/20 text-inkBlack/30'
                    }`}
                  >
                    {item.status === 'open' ? '✓ Afgehandeld' : 'Gedaan'}
                  </button>
                </div>
                <p className="text-[9px] text-inkBlack/30">
                  {new Date(item.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
