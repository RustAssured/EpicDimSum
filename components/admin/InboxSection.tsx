'use client'

import { useEffect, useState } from 'react'
import { Restaurant } from '@/lib/types'
import Mascot from '@/components/Mascot'

interface InboxSectionProps {
  secret: string
  restaurants: Restaurant[]
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<Restaurant>) => void
}

const DISMISS_KEY_PREFIX = 'inbox_dismissed_'

function humanizeError(error: string): string {
  if (error === 'Unauthorized') return 'Verkeerd wachtwoord, check je Sync Secret'
  return error
}

function isInboxItem(r: Restaurant): boolean {
  if (r.source === 'user') return true
  if (r.verified === false && r.agentReason) return true
  if (r.epicScore === 0) return true
  return false
}

function getDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const ids = new Set<string>()
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith(DISMISS_KEY_PREFIX)) {
      ids.add(key.slice(DISMISS_KEY_PREFIX.length))
    }
  }
  return ids
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function InboxSection({ secret, restaurants, onRemove, onUpdate }: InboxSectionProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Record<string, 'approve' | 'reject' | null>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectInput, setRejectInput] = useState('')

  useEffect(() => {
    setDismissed(getDismissedIds())
  }, [])

  const items = restaurants
    .filter(isInboxItem)
    .filter((r) => !dismissed.has(r.id))
    .sort((a, b) => {
      const aDate = a.sources?.lastUpdated ?? ''
      const bDate = b.sources?.lastUpdated ?? ''
      if (aDate !== bDate) return bDate.localeCompare(aDate)
      return b.id.localeCompare(a.id)
    })

  const handleApprove = async (r: Restaurant) => {
    setBusy((s) => ({ ...s, [r.id]: 'approve' }))
    setErrors((s) => ({ ...s, [r.id]: '' }))
    try {
      // 1. Sync the restaurant
      const syncRes = await fetch(`/api/sync/${r.id}`, {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}))
        throw new Error(humanizeError(err.error || `HTTP ${syncRes.status}`))
      }
      const syncJson = await syncRes.json()
      const syncedRestaurant: Restaurant = syncJson.restaurant ?? syncJson

      // 2. Mark verified
      const verifyRes = await fetch(`/api/admin/verify/${r.id}`, {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}))
        throw new Error(humanizeError(err.error || `HTTP ${verifyRes.status}`))
      }

      onUpdate(r.id, { ...syncedRestaurant, verified: true })
      onRemove(r.id)
    } catch (err) {
      setErrors((s) => ({
        ...s,
        [r.id]: err instanceof Error ? err.message : 'Goedkeuren mislukt',
      }))
    } finally {
      setBusy((s) => ({ ...s, [r.id]: null }))
    }
  }

  const startReject = (id: string) => {
    setRejectingId(id)
    setRejectInput('')
    setErrors((s) => ({ ...s, [id]: '' }))
  }

  const cancelReject = () => {
    setRejectingId(null)
    setRejectInput('')
  }

  const confirmReject = async (r: Restaurant) => {
    if (rejectInput.trim() !== r.name) return
    setBusy((s) => ({ ...s, [r.id]: 'reject' }))
    setErrors((s) => ({ ...s, [r.id]: '' }))
    try {
      const res = await fetch(`/api/admin/delete/${r.id}`, {
        method: 'DELETE',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      onRemove(r.id)
      setRejectingId(null)
      setRejectInput('')
    } catch (err) {
      setErrors((s) => ({
        ...s,
        [r.id]: err instanceof Error ? err.message : 'Verwijderen mislukt',
      }))
    } finally {
      setBusy((s) => ({ ...s, [r.id]: null }))
    }
  }

  const handleLater = (r: Restaurant) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `${DISMISS_KEY_PREFIX}${r.id}`,
        new Date().toISOString()
      )
    }
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(r.id)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-8 text-center">
        <Mascot type="happy" size={64} className="mx-auto mb-3" />
        <p className="font-black text-inkBlack">Inbox is leeg. Gao is tevreden. 🥟</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Mascot type="judge" size={32} alt="Gao the dumpling judge" />
        <div>
          <h2 className="font-black text-inkBlack">Inbox</h2>
          <p className="text-[11px] text-inkBlack/50">
            {items.length} item{items.length === 1 ? '' : 's'} om te beoordelen
          </p>
        </div>
      </div>

      {items.map((r) => {
        const action = busy[r.id]
        const error = errors[r.id]
        const isRejecting = rejectingId === r.id
        const canConfirmReject = rejectInput.trim() === r.name

        return (
          <div
            key={r.id}
            className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-black text-inkBlack break-words">{r.name}</h3>
                  {r.source === 'user' && (
                    <span
                      title="Gebruikerssuggestie"
                      className="text-[10px] font-black bg-epicPurple/15 text-epicPurple border border-epicPurple/30 rounded-full px-2 py-0.5"
                    >
                      🧺 Gebruiker
                    </span>
                  )}
                  {r.source === 'engine' && (
                    <span
                      title="Engine ontdekking"
                      className="text-[10px] font-black bg-inkBlack/10 text-inkBlack/70 border border-inkBlack/20 rounded-full px-2 py-0.5"
                    >
                      🤖 Engine
                    </span>
                  )}
                  {r.agentReason && (
                    <span
                      title="Door agent geflagd"
                      className="text-[10px] font-black bg-epicRed/10 text-epicRed border border-epicRed/30 rounded-full px-2 py-0.5"
                    >
                      🚩 Geflagd
                    </span>
                  )}
                  {r.epicScore === 0 && (
                    <span className="text-[10px] font-black bg-epicGold/20 text-epicGold border border-epicGold/40 rounded-full px-2 py-0.5">
                      Nieuw
                    </span>
                  )}
                </div>
                <p className="text-xs text-inkBlack/50">
                  {r.city}
                  {r.sources?.lastUpdated ? ` · Toegevoegd ${formatDate(r.sources.lastUpdated)}` : ''}
                </p>
                {r.note && (
                  <p className="text-[12px] text-inkBlack/70 italic mt-1.5">
                    &ldquo;{r.note}&rdquo;
                    {r.submittedBy && (
                      <span className="not-italic text-[10px] text-inkBlack/40 ml-1">
                        — {r.submittedBy}
                      </span>
                    )}
                  </p>
                )}
                {r.agentReason && (
                  <p className="text-[12px] text-epicRed/80 mt-1.5">
                    <span className="font-black">Agent:</span> {r.agentReason}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-2 mb-2 p-2 rounded-lg bg-epicRed/10 border border-epicRed/30 text-xs text-epicRed font-medium">
                {error}
              </div>
            )}

            {!isRejecting && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => handleApprove(r)}
                  disabled={action !== null && action !== undefined}
                  className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-epicGreen text-cream disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  {action === 'approve' ? '⏳ Bezig...' : '✓ Goedkeuren'}
                </button>
                <button
                  onClick={() => startReject(r.id)}
                  disabled={action !== null && action !== undefined}
                  className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-epicRed text-cream disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  ✕ Weigeren
                </button>
                <button
                  onClick={() => handleLater(r)}
                  disabled={action !== null && action !== undefined}
                  className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream text-inkBlack disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Later
                </button>
              </div>
            )}

            {isRejecting && (
              <div className="mt-3 p-3 rounded-xl bg-epicRed/5 border-2 border-epicRed/40 space-y-2">
                <p className="text-xs font-bold text-epicRed">
                  Weet je het zeker? Typ de restaurantnaam om te bevestigen.
                </p>
                <input
                  type="text"
                  value={rejectInput}
                  onChange={(e) => setRejectInput(e.target.value)}
                  placeholder="Typ restaurantnaam om te bevestigen"
                  className="w-full px-3 py-2 rounded-xl border-2 border-inkBlack text-sm font-medium bg-white focus:outline-none shadow-brutal-sm"
                  autoFocus
                />
                <p className="text-[10px] text-inkBlack/40">
                  Verwacht: <span className="font-black">{r.name}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmReject(r)}
                    disabled={!canConfirmReject || action === 'reject'}
                    className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-epicRed text-cream disabled:opacity-30 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    {action === 'reject' ? '⏳ Bezig...' : 'Definitief weigeren'}
                  </button>
                  <button
                    onClick={cancelReject}
                    disabled={action === 'reject'}
                    className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream text-inkBlack disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    Annuleer
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function getInboxCount(restaurants: Restaurant[]): number {
  if (typeof window === 'undefined') {
    return restaurants.filter(isInboxItem).length
  }
  const dismissed = getDismissedIds()
  return restaurants.filter((r) => isInboxItem(r) && !dismissed.has(r.id)).length
}

export { isInboxItem }
