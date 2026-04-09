'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { isTrustedForPublicFeed } from '@/lib/db'
import restaurantsData from '@/data/restaurants.json'
import Mascot from '@/components/Mascot'

const restaurants = restaurantsData as Restaurant[]

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

  // Sync-all state
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number } | null>(null)

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

  // Discovery state
  const [discoverState, setDiscoverState] = useState<{
    loading: boolean
    result: { discovered: number; added: number; skipped: number } | null
    error: string | null
  }>({ loading: false, result: null, error: null })

  // Per-city scan state
  const [scanning, setScanning] = useState<string | null>(null)
  const [cityScanResults, setCityScanResults] = useState<Record<string, string>>({})


  // Verify-all state
  const [verifyAllState, setVerifyAllState] = useState<{ loading: boolean; result: string | null; error: string | null }>({
    loading: false, result: null, error: null,
  })

  // Restaurant list filter
  const [listFilter, setListFilter] = useState<'all' | 'verified' | 'review'>('all')

  // Cleanup state
  const [cleanupState, setCleanupState] = useState<{
    loading: boolean
    result: { removed: string[]; count: number } | null
    error: string | null
  }>({ loading: false, result: null, error: null })

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
    setSyncAllProgress({ current: 0, total: restaurants.length })
    for (let i = 0; i < restaurants.length; i++) {
      setSyncAllProgress({ current: i + 1, total: restaurants.length })
      await handleSync(restaurants[i].id)
      if (i < restaurants.length - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    setSyncAllProgress(null)
  }

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleCleanup = async () => {
    setCleanupState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      const data = await res.json()
      setCleanupState({ loading: false, result: data, error: null })
    } catch (err) {
      setCleanupState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  const handleVerifyAll = async () => {
    setVerifyAllState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/admin/verify-all', {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      const data = await res.json()
      setVerifyAllState({ loading: false, result: `✓ ${data.verified} restaurants geverifieerd`, error: null })
    } catch (err) {
      setVerifyAllState({ loading: false, result: null, error: err instanceof Error ? err.message : 'Fout' })
    }
  }

  const handleDiscover = async () => {
    setDiscoverState({ loading: true, result: null, error: null })
    try {
      const res = await fetch('/api/cron/discover', {
        headers: { Authorization: `Bearer ${secret}` },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }

      const data = await res.json()
      setDiscoverState({ loading: false, result: data, error: null })
    } catch (err) {
      setDiscoverState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Onbekende fout',
      })
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

        {/* Bulk actions */}
        <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-0">
            <p className="font-black text-inkBlack text-sm">Bulk acties</p>
            {syncAllProgress && (
              <p className="text-xs text-epicGold font-bold mt-0.5">
                Syncing {syncAllProgress.current}/{syncAllProgress.total}...
              </p>
            )}
          </div>

          {/* Sync alle */}
          <button
            onClick={handleSyncAll}
            disabled={syncAllProgress !== null}
            className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
              ${syncAllProgress !== null
                ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                : 'bg-epicGold text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
          >
            {syncAllProgress
              ? `⏳ ${syncAllProgress.current}/${syncAllProgress.total}`
              : '🔄 Sync alle restaurants'}
          </button>

          {/* Verifieer alles */}
          <button
            onClick={handleVerifyAll}
            disabled={verifyAllState.loading}
            className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
              ${verifyAllState.loading
                ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                : 'bg-epicGreen text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
          >
            {verifyAllState.loading ? '⏳ Bezig...' : '✓ Verifieer alles'}
          </button>

          {/* Discover */}
          <button
            onClick={handleDiscover}
            disabled={discoverState.loading}
            className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
              ${discoverState.loading
                ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                : 'bg-epicPurple text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
          >
            {discoverState.loading ? '⏳ Bezig...' : '🔍 Ontdek nieuwe spots'}
          </button>

          {/* Opruimen */}
          <button
            onClick={handleCleanup}
            disabled={cleanupState.loading}
            className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
              ${cleanupState.loading
                ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                : 'bg-inkBlack text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
          >
            {cleanupState.loading ? '⏳ Opruimen...' : '🧹 Opruimen'}
          </button>

          {verifyAllState.error && (
            <p className="w-full text-xs text-epicRed font-medium">Verifieer fout: {verifyAllState.error}</p>
          )}
          {verifyAllState.result && (
            <p className="w-full text-xs text-epicGreen font-bold">{verifyAllState.result}</p>
          )}

          {discoverState.error && (
            <p className="w-full text-xs text-epicRed font-medium">Fout: {discoverState.error}</p>
          )}
          {discoverState.result && (
            <p className="w-full text-xs text-epicGreen font-bold">
              ✓ {discoverState.result.discovered} gevonden · {discoverState.result.added} toegevoegd · {discoverState.result.skipped} overgeslagen
            </p>
          )}
          {cleanupState.error && (
            <p className="w-full text-xs text-epicRed font-medium">Cleanup fout: {cleanupState.error}</p>
          )}
          {cleanupState.result && (
            <p className="w-full text-xs text-epicGreen font-bold">
              {cleanupState.result.count === 0
                ? '✓ Niets te verwijderen'
                : `🧹 ${cleanupState.result.count} verwijderd: ${cleanupState.result.removed.join(' · ')}`}
            </p>
          )}

          {/* Per-city scan */}
          <div className="w-full border-t border-inkBlack/10 pt-3 flex flex-wrap gap-2">
            <p className="text-xs font-bold text-inkBlack/50 w-full uppercase tracking-wide">Scan per stad:</p>
            {['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven'].map((city) => (
              <div key={city} className="flex flex-col items-start gap-0.5">
                <button
                  onClick={() => handleCityScan(city)}
                  disabled={!!scanning}
                  className="text-xs font-black px-3 py-1.5 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream hover:bg-epicRed/10 disabled:opacity-50 transition-all"
                >
                  {scanning === city ? '⏳ Scanning...' : `🔍 ${city}`}
                </button>
                {cityScanResults[city] && (
                  <span className="text-[10px] text-inkBlack/50 pl-1">{cityScanResults[city]}</span>
                )}
              </div>
            ))}
          </div>
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
                  Google Place ID
                </label>
                <input
                  type="text"
                  value={addForm.placeId}
                  onChange={(e) => setAddForm((f) => ({ ...f, placeId: e.target.value }))}
                  placeholder="ChIJ..."
                  required
                  className="w-full px-3 py-2 rounded-xl border-[2px] border-inkBlack text-sm font-medium bg-cream focus:outline-none shadow-brutal-sm"
                />
              </div>
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
                  <option>Eindhoven</option>
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
            {restaurants
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
                      <button
                        onClick={() => handleSync(restaurant.id)}
                        disabled={state?.loading}
                        className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                          ${state?.loading
                            ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                            : 'bg-epicRed text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                          }`}
                      >
                        {state?.loading ? '⏳ Bezig...' : '🔄 Sync'}
                      </button>
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
                    <div className="mt-2 p-3 rounded-xl bg-epicRed/10 border border-epicRed/30 text-xs text-epicRed font-medium">
                      Fout: {state.error}
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
