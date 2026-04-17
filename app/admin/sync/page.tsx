'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { isTrustedForPublicFeed } from '@/lib/db'
import restaurantsData from '@/data/restaurants.json'
import Mascot from '@/components/Mascot'

interface SyncState {
  loading: boolean
  result: Restaurant | null
  error: string | null
}

function humanizeError(error: string): string {
  if (error === 'Unauthorized') return 'Verkeerd wachtwoord — check je Sync Secret'
  return error
}

export default function AdminSyncPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({})
  const [adminRestaurants, setAdminRestaurants] = useState<Restaurant[]>(restaurantsData as Restaurant[])

  // Sync-all state
  const [syncAllState, setSyncAllState] = useState<{ loading: boolean; result: string | null; error: string | null }>({ loading: false, result: null, error: null })

  // Add restaurant form
  const [addForm, setAddForm] = useState({
    placeId: '',
    name: '',
    city: 'Amsterdam' as City,
    priceRange: '€€' as PriceRange,
  })
  const [addState, setAddState] = useState<{ loading: boolean; result: Restaurant | null; error: string | null }>({
    loading: false, result: null, error: null,
  })
  const [lookupState, setLookupState] = useState<{ loading: boolean; error: string | null }>({
    loading: false, error: null,
  })

  // Per-city scan state
  const [scanning, setScanning] = useState<string | null>(null)
  const [cityScanResults, setCityScanResults] = useState<Record<string, string>>({})

  // Grote NL scan state
  const [fullScanRunning, setFullScanRunning] = useState(false)
  const [fullScanResult, setFullScanResult] = useState<string | null>(null)


  // Restaurant list filter
  const [listFilter, setListFilter] = useState<'all' | 'verified' | 'review'>('all')

  // Cleanup non-dim-sum state
  const [cleanupNonDimSumState, setCleanupNonDimSumState] = useState<{
    loading: boolean
    result: { removed: string[]; count: number } | null
    error: string | null
  }>({ loading: false, result: null, error: null })

  // Agent state
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentResult, setAgentResult] = useState<any>(null)

  // Silent seed cleanup on mount
  useEffect(() => {
    if (!secret) return
    fetch('/api/admin/cleanup-seeds', {
      method: 'POST',
      headers: { 'x-sync-secret': secret },
    }).catch(() => {})
  }, [secret])

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (secret.trim()) setAuthed(true)
  }

  const handleSync = async (restaurantId: string) => {
    setSyncStates((prev) => ({
      ...prev,
      [restaurantId]: { loading: true, result: null, error: null },
    }))

    try {
      const res = await fetch(`/api/sync/${restaurantId}`, {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }

      const json = await res.json()
      const data: Restaurant = json.restaurant ?? json
      setSyncStates((prev) => ({
        ...prev,
        [restaurantId]: { loading: false, result: data, error: null },
      }))
    } catch (err) {
      setSyncStates((prev) => ({
        ...prev,
        [restaurantId]: {
          loading: false,
          result: null,
          error: err instanceof Error ? err.message : 'Onbekende fout',
        },
      }))
    }
  }

  const handleSyncAll = async () => {
    if (!secret) return
    setSyncAllState({ loading: true, result: null, error: null })

    try {
      // Fetch ALL restaurants including unverified — use admin endpoint
      const res = await fetch('/api/admin/restaurants', {
        headers: { 'x-sync-secret': secret },
      })

      const allRestaurants: Restaurant[] = res.ok ? await res.json() : adminRestaurants

      setAdminRestaurants(allRestaurants)
      setSyncAllState({
        loading: false,
        result: `Syncing ${allRestaurants.length} restaurants...`,
        error: null,
      })

      // Sync each one
      for (let i = 0; i < allRestaurants.length; i++) {
        await handleSync(allRestaurants[i].id)
        setSyncAllState({
          loading: true,
          result: `Syncing ${i + 1}/${allRestaurants.length}...`,
          error: null,
        })
      }

      setSyncAllState({
        loading: false,
        result: `✓ Alle ${allRestaurants.length} restaurants gesyncet`,
        error: null,
      })
    } catch (err) {
      setSyncAllState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Fout',
      })
    }
  }

  const handleDeleteFlagged = async () => {
    if (!window.confirm('Verwijder alle geflagde restaurants? Dit kan niet ongedaan worden.')) return

    const flagged = adminRestaurants.filter(r => r.verified === false)

    for (const r of flagged) {
      await handleDelete(r.id)
    }

    setAdminRestaurants(prev => prev.filter(r => r.verified !== false))
  }

  const handleDelete = async (restaurantId: string) => {
    if (!window.confirm('Weet je het zeker? Dit verwijdert het restaurant permanent.')) return
    try {
      const res = await fetch(`/api/admin/delete/${restaurantId}`, {
        method: 'DELETE',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      setAdminRestaurants((prev) => prev.filter((r) => r.id !== restaurantId))
      setSyncStates((prev) => {
        const next = { ...prev }
        delete next[restaurantId]
        return next
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verwijderen mislukt')
    }
  }

  const handleLookupByName = async () => {
    if (!addForm.name || !addForm.city) return
    setLookupState({ loading: true, error: null })
    try {
      const res = await fetch('/api/admin/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sync-secret': secret },
        body: JSON.stringify({ name: addForm.name, city: addForm.city }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(humanizeError(data.error || `HTTP ${res.status}`))
      setAddForm((f) => ({ ...f, placeId: data.placeId, name: data.name }))
      setLookupState({ loading: false, error: null })
    } catch (err) {
      setLookupState({ loading: false, error: err instanceof Error ? err.message : 'Lookup mislukt' })
    }
  }

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.placeId) {
      setAddState({ loading: false, result: null, error: 'Zoek eerst een Place ID op via de knop' })
      return
    }
    setAddState({ loading: true, result: null, error: null })

    try {
      const res = await fetch('/api/admin/add-restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': secret,
        },
        body: JSON.stringify(addForm),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }

      const data: Restaurant = await res.json()
      setAddState({ loading: false, result: data, error: null })
      setAddForm({ placeId: '', name: '', city: 'Amsterdam', priceRange: '€€' })
    } catch (err) {
      setAddState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  const handleCityScan = async (city: string) => {
    setScanning(city)
    try {
      const res = await fetch(`/api/admin/full-scan?city=${encodeURIComponent(city)}`, {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      const data = await res.json()
      setCityScanResults((prev) => ({
        ...prev,
        [city]: `✓ ${data.added} nieuw, ${data.found} gevonden`,
      }))
    } catch (err) {
      setCityScanResults((prev) => ({
        ...prev,
        [city]: `⚠️ ${err instanceof Error ? err.message : 'Fout'}`,
      }))
    } finally {
      setScanning(null)
    }
  }

  const handleFullScan = async () => {
    if (!secret) return
    setFullScanRunning(true)
    setFullScanResult('Gestart...')

    const cities = [
      'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven',
      'Groningen', 'Leeuwarden', 'Assen', 'Zwolle', 'Arnhem',
      'Maastricht', 'Middelburg', 'Lelystad', "'s-Hertogenbosch"
    ]

    let totalAdded = 0

    for (const city of cities) {
      setFullScanResult(`Scanning ${city}...`)
      try {
        const res = await fetch(
          `/api/admin/full-scan?city=${encodeURIComponent(city)}`,
          {
            method: 'POST',
            headers: { 'x-sync-secret': secret },
            signal: AbortSignal.timeout(30000), // 30s per city max
          }
        )
        if (res.ok) {
          const data = await res.json()
          totalAdded += data.added ?? 0
          setFullScanResult(`${city} ✓ — ${totalAdded} nieuw totaal`)
        } else {
          setFullScanResult(`${city} overgeslagen — doorgaan...`)
        }
      } catch {
        // Timeout or error — skip this city and continue
        setFullScanResult(`${city} timeout — doorgaan...`)
      }
      // Small pause between cities
      await new Promise(r => setTimeout(r, 1500))
    }

    setFullScanResult(`✓ Klaar! ${totalAdded} nieuwe restaurants gevonden`)
    setFullScanRunning(false)
  }

  const handleCleanupNonDimSum = async () => {
    if (!window.confirm('Verwijder alle non-dim-sum restaurants? Dit kan niet ongedaan worden gemaakt.')) return
    setCleanupNonDimSumState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/admin/cleanup?mode=non-dim-sum', {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      const data = await res.json()
      setCleanupNonDimSumState({ loading: false, result: data, error: null })
    } catch (err) {
      setCleanupNonDimSumState({ loading: false, result: null, error: err instanceof Error ? err.message : 'Fout' })
    }
  }

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

  if (!authed) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-6">
            <h1 className="text-xl font-black text-inkBlack mb-1">Admin Sync</h1>
            <p className="text-sm text-inkBlack/50 mb-4">Voer je sync secret in</p>
            <form onSubmit={handleAuth} className="space-y-3">
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="SYNC_SECRET"
                className="w-full px-4 py-3 rounded-full border-[3px] border-inkBlack shadow-brutal-md bg-cream text-sm font-medium focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 rounded-full border-[3px] border-inkBlack shadow-brutal font-black text-sm bg-epicRed text-cream hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
              >
                Inloggen
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-cream border-b-[3px] border-inkBlack">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sm font-black text-inkBlack/60 hover:text-inkBlack transition-colors">
            ← Home
          </Link>
          <h1 className="font-black text-inkBlack flex-1">Admin Sync Panel</h1>
          <span className="text-xs bg-epicGreen/20 text-epicGreen border border-epicGreen/30 rounded-full px-2 py-0.5 font-bold">
            Ingelogd
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Agent Status */}
        <div className="p-4 rounded-2xl border-[3px] border-epicPurple/40 bg-epicPurple/5 shadow-[4px_4px_0px_rgba(83,74,183,0.3)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mascot type="judge" size={32} />
              <div>
                <p className="font-black text-sm">Kwaliteitsagent</p>
                <p className="text-[10px] text-inkBlack/40">
                  {agentResult?.mode
                    ? `Mode: ${agentResult.mode}`
                    : 'Dagelijkse dim sum verificatie'}
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

          {agentResult && !agentResult.skipped && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-bold">
                Mode: <span className="text-epicPurple">{agentResult.mode}</span>
                {' · '}Gecheckt: {agentResult.checked}
                {' · '}Geflagged: {agentResult.flagged}
                {agentResult.removed > 0 && ` · Verwijderd: ${agentResult.removed}`}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                {agentResult.results?.map((r: { name: string; verdict: string; confidence: number; reasoning: string }, i: number) => (
                  <div key={i} className={`text-[10px] px-2 py-1 rounded-lg ${
                    r.verdict === 'remove' ? 'bg-red-50 text-red-600' :
                    r.verdict === 'flag' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    <span className="font-black">{r.name}</span>
                    {' '}({r.confidence}%)
                    {' — '}{r.reasoning}
                  </div>
                ))}
              </div>
            </div>
          )}
          {agentResult?.skipped && (
            <p className="text-xs text-inkBlack/40 mt-1">{agentResult.reason}</p>
          )}
        </div>

        {/* Sync */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-inkBlack text-sm">Sync</p>
              {syncAllState.result && (
                <p className={`text-xs font-bold mt-0.5 ${syncAllState.error ? 'text-epicRed' : 'text-epicGold'}`}>
                  {syncAllState.result}
                </p>
              )}
              {syncAllState.error && (
                <p className="text-xs text-epicRed font-bold mt-0.5">{syncAllState.error}</p>
              )}
            </div>
            <button
              onClick={handleSyncAll}
              disabled={syncAllState.loading}
              className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                ${syncAllState.loading
                  ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                  : 'bg-epicGold text-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                }`}
            >
              {syncAllState.loading ? `⏳ ${syncAllState.result ?? '...'}` : 'Sync alle restaurants'}
            </button>
            <button
              onClick={handleDeleteFlagged}
              className="text-xs font-black px-3 py-2 rounded-full bg-epicRed text-cream border-2 border-inkBlack shadow-brutal-sm"
            >
              🗑️ Verwijder alle geflagde
            </button>
          </div>

          {/* Per-city scan */}
          <div className="border-t border-inkBlack/10 pt-3 flex flex-wrap gap-2">
            <p className="text-xs font-bold text-inkBlack/50 w-full uppercase tracking-wide">Scan per stad:</p>
            {[
              'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Arnhem',
              'Eindhoven', 'Groningen', 'Leeuwarden', 'Lelystad', 'Maastricht',
              'Middelburg', 'Assen', 'Zwolle', "'s-Hertogenbosch",
            ].map((city) => (
              <div key={city} className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => handleCityScan(city)}
                  disabled={!!scanning}
                  className="text-xs font-black px-3 py-1.5 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream active:bg-epicRed/10 disabled:opacity-50 transition-all"
                >
                  {scanning === city ? '⏳ Scanning...' : `🔍 ${city}`}
                </button>
                {cityScanResults[city] && (
                  <span className="text-[10px] text-inkBlack/50 pl-1">{cityScanResults[city]}</span>
                )}
              </div>
            ))}
            {/* Grote NL scan */}
            <div className="border-t border-inkBlack/10 pt-3 w-full flex items-center gap-3">
              <button
                onClick={handleFullScan}
                disabled={fullScanRunning || !!scanning}
                className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                  ${fullScanRunning || !!scanning
                    ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                    : 'bg-epicGreen text-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  }`}
              >
                {fullScanRunning ? '⏳ Alle steden scannen...' : '🌍 Grote NL scan'}
              </button>
              {fullScanResult && (
                <span className="text-xs font-bold text-inkBlack/60">{fullScanResult}</span>
              )}
            </div>
          </div>
        </div>

        {/* Opruimen */}
        <div className="rounded-2xl border-[3px] border-epicRed/40 bg-epicRed/5 shadow-brutal p-4">
          <p className="font-black text-sm text-epicRed mb-3">Opruimen</p>
          <button
            onClick={handleCleanupNonDimSum}
            disabled={cleanupNonDimSumState.loading}
            className={`px-4 py-2 rounded-full border-2 border-epicRed font-black text-sm shadow-brutal-sm transition-all
              ${cleanupNonDimSumState.loading
                ? 'bg-epicRed/10 text-epicRed/40 cursor-not-allowed shadow-none'
                : 'bg-epicRed text-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
              }`}
          >
            {cleanupNonDimSumState.loading ? '⏳ Bezig...' : '🗑️ Verwijder non-dim-sum'}
          </button>
          {cleanupNonDimSumState.error && (
            <p className="text-xs text-epicRed font-medium mt-2">{cleanupNonDimSumState.error}</p>
          )}
          {cleanupNonDimSumState.result && (
            <p className="text-xs text-epicGreen font-bold mt-2">
              {cleanupNonDimSumState.result.count === 0
                ? '✓ Geen non-dim-sum restaurants gevonden'
                : `🗑️ ${cleanupNonDimSumState.result.count} verwijderd: ${cleanupNonDimSumState.result.removed.join(' · ')}`}
            </p>
          )}
        </div>

        {/* Add restaurant form */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white overflow-hidden">
          <div className="p-4 border-b-[2px] border-inkBlack/10 bg-epicGreen/5">
            <h2 className="font-black text-inkBlack">Voeg restaurant toe</h2>
            <p className="text-xs text-inkBlack/50 mt-0.5">
              Voert automatisch een volledige sync uit na toevoeging
            </p>
          </div>
          <form onSubmit={handleAddRestaurant} className="p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-inkBlack/50 mb-1 block">
                  Restaurant naam
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Naam"
                  required
                  className="w-full px-3 py-2 rounded-xl border-[2px] border-inkBlack text-sm font-medium bg-cream focus:outline-none shadow-brutal-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-inkBlack/50 mb-1 block">
                  Google Place ID <span className="text-inkBlack/30 normal-case font-medium">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={addForm.placeId}
                  onChange={(e) => setAddForm((f) => ({ ...f, placeId: e.target.value }))}
                  placeholder="ChIJ... of gebruik opzoeken ↓"
                  className="w-full px-3 py-2 rounded-xl border-[2px] border-inkBlack text-sm font-medium bg-cream focus:outline-none shadow-brutal-sm"
                />
                {!addForm.placeId && addForm.name && (
                  <button
                    type="button"
                    onClick={handleLookupByName}
                    disabled={lookupState.loading}
                    className="mt-1.5 text-xs font-black px-3 py-1.5 rounded-full border-2 border-epicGold text-epicGold hover:bg-epicGold/10 disabled:opacity-50 transition-colors"
                  >
                    {lookupState.loading ? '⏳ Zoeken...' : '🔍 Zoek Place ID op naam'}
                  </button>
                )}
                {lookupState.error && (
                  <p className="text-[10px] text-epicRed mt-1">{lookupState.error}</p>
                )}
                {addForm.placeId && (
                  <p className="text-[10px] text-epicGreen mt-1 font-medium">✓ Place ID gevonden</p>
                )}
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-inkBlack/50 mb-1 block">
                  Stad
                </label>
                <select
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value as City }))}
                  className="w-full px-3 py-2 rounded-xl border-[2px] border-inkBlack text-sm font-medium bg-cream focus:outline-none shadow-brutal-sm"
                >
                  <option>Amsterdam</option>
                  <option>Rotterdam</option>
                  <option>Den Haag</option>
                  <option>Utrecht</option>
                  <option>Arnhem</option>
                  <option>Eindhoven</option>
                  <option>Groningen</option>
                  <option>Leeuwarden</option>
                  <option>Lelystad</option>
                  <option>Maastricht</option>
                  <option>Middelburg</option>
                  <option>Assen</option>
                  <option>Zwolle</option>
                  <option>{"'s-Hertogenbosch"}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wide text-inkBlack/50 mb-1 block">
                  Prijs
                </label>
                <select
                  value={addForm.priceRange}
                  onChange={(e) => setAddForm((f) => ({ ...f, priceRange: e.target.value as PriceRange }))}
                  className="w-full px-3 py-2 rounded-xl border-[2px] border-inkBlack text-sm font-medium bg-cream focus:outline-none shadow-brutal-sm"
                >
                  <option value="€">€ — Budget</option>
                  <option value="€€">€€ — Midden</option>
                  <option value="€€€">€€€ — Luxe</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={addState.loading}
              className={`w-full py-2.5 rounded-full border-[3px] border-inkBlack font-black text-sm transition-all
                ${addState.loading
                  ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                  : 'bg-epicGreen text-cream shadow-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none'
                }`}
            >
              {addState.loading ? '⏳ Bezig met toevoegen...' : '➕ Voeg toe & sync'}
            </button>

            {addState.error && (
              <div className="p-3 rounded-xl bg-epicRed/10 border border-epicRed/30 text-xs text-epicRed font-medium">
                Fout: {addState.error}
              </div>
            )}
            {addState.result && (
              <div className="p-3 rounded-xl bg-epicGreen/10 border border-epicGreen/30">
                <p className="text-xs font-black text-epicGreen mb-1">
                  ✓ {addState.result.name} toegevoegd! EpicScore: {addState.result.epicScore}
                </p>
                <p className="text-xs text-inkBlack/50">{addState.result.mustOrder}</p>
              </div>
            )}
          </form>
        </div>

        {/* Sync existing restaurants */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mascot type="judge" size={36} alt="Gao de dumpling judge" />
            <h2 className="font-black text-lg text-inkBlack">Bestaande restaurants</h2>
            <p className="text-sm text-inkBlack/50">Sync individuele restaurants...</p>
          </div>

          {/* Filter toggle */}
          <div className="flex gap-1 mb-3">
            {(['all', 'verified', 'review'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setListFilter(f)}
                className={`text-xs font-black px-3 py-1 rounded-full border-2 border-inkBlack transition-colors ${
                  listFilter === f ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack/60 hover:text-inkBlack'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'verified' ? '✓ Geverifieerd' : '⚠️ Te reviewen'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {adminRestaurants
              .filter((r) => {
                const synced = syncStates[r.id]?.result
                const isVerified = synced ? synced.verified === true : r.epicScore > 20 && r.haGaoIndex > 0
                if (listFilter === 'verified') return isVerified
                if (listFilter === 'review') return !isVerified
                return true
              })
              .map((restaurant) => {
              const state = syncStates[restaurant.id]
              const lastUpdated = new Date(restaurant.sources.lastUpdated).toLocaleDateString('nl-NL', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })

              return (
                <div
                  key={restaurant.id}
                  className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-inkBlack">{restaurant.name}</h3>
                        {restaurant.epicScore === 0 && (
                          <span className="text-[10px] font-black bg-epicGold/20 text-epicGold border border-epicGold/40 rounded-full px-2 py-0.5">
                            ⚠️ Sync nodig
                          </span>
                        )}
                        {state?.result && state.result.verified !== true && (
                          <span className="text-[10px] font-black bg-epicRed/10 text-epicRed border border-epicRed/30 rounded-full px-2 py-0.5">
                            ⚠️ Niet geverifieerd
                          </span>
                        )}
                        {state?.result && state.result.verified === true && (
                          <span className="text-[10px] font-black bg-epicGreen/20 text-epicGreen border border-epicGreen/40 rounded-full px-2 py-0.5">
                            ✓ Geverifieerd
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-inkBlack/50">{restaurant.city} &middot; EpicScore: {state?.result?.epicScore ?? restaurant.epicScore}</p>
                      {(() => {
                        const r = state?.result ?? restaurant
                        if (isTrustedForPublicFeed(r)) return null
                        const gates: string[] = []
                        if ((r.dumplingMentionScore ?? 0) < 15) gates.push('geen dumpling mentions')
                        if ((r.haGaoIndex ?? 0) < 2.0) gates.push('Ha Gao te laag')
                        if (r.epicScore < 20) gates.push('score te laag')
                        if (gates.length === 0) return null
                        return (
                          <p className="text-[10px] text-inkBlack/30 mt-0.5">{gates.join(' · ')}</p>
                        )
                      })()}
                      <p className="text-xs text-inkBlack/30 mt-0.5">Laatste sync: {lastUpdated}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSync(restaurant.id)}
                          disabled={state?.loading}
                          className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                            ${state?.loading
                              ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                              : 'bg-epicRed text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                            }`}
                        >
                          {state?.loading ? '⏳' : '🔄 Sync'}
                        </button>
                        <button
                          onClick={() => handleDelete(restaurant.id)}
                          className="text-xs font-black px-2 py-1 rounded-lg border-2 border-red-300 text-red-400 hover:bg-red-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      {state?.result && state.result.verified !== true && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/verify/${restaurant.id}`, {
                              method: 'POST',
                              headers: { 'x-sync-secret': secret },
                            })
                            setSyncStates((prev) => ({
                              ...prev,
                              [restaurant.id]: {
                                ...prev[restaurant.id],
                                result: prev[restaurant.id]?.result
                                  ? { ...prev[restaurant.id].result!, verified: true }
                                  : null,
                              },
                            }))
                          }}
                          className="px-3 py-1.5 rounded-full border-2 border-inkBlack font-black text-xs bg-epicGreen text-cream shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                          ✓ Verifieer
                        </button>
                      )}
                    </div>
                  </div>

                  {state?.error && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 rounded-lg">
                      <Mascot type="angrygao" size={28} />
                      <p className="text-xs text-red-600 font-bold">{state.error}</p>
                    </div>
                  )}
                  {state?.result && (
                    <div className="mt-2 p-3 rounded-xl bg-epicGreen/10 border border-epicGreen/30">
                      <p className="text-xs font-black text-epicGreen mb-2">✓ Sync geslaagd!</p>
                      <pre className="text-xs text-inkBlack/60 overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(
                          {
                            epicScore: state.result.epicScore,
                            haGaoIndex: state.result.haGaoIndex,
                            scores: state.result.scores,
                            mustOrder: state.result.mustOrder,
                            verified: state.result.verified,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
