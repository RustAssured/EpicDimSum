'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Restaurant, City, PriceRange } from '@/lib/types'
import restaurantsData from '@/data/restaurants.json'

const restaurants = restaurantsData as Restaurant[]

interface SyncState {
  loading: boolean
  result: Restaurant | null
  error: string | null
}

export default function AdminSyncPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({})

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
        throw new Error(err.error || `HTTP ${res.status}`)
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
        throw new Error(err.error || `HTTP ${res.status}`)
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
          <h2 className="font-black text-inkBlack mb-3">Bestaande restaurants</h2>
          <p className="text-sm text-inkBlack/50 mb-4">
            Sync individuele restaurants. Roept Google Places API, Iens, buzz engine en Claude Haiku aan.
          </p>
          <div className="space-y-4">
            {restaurants.map((restaurant) => {
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
                    <div>
                      <h3 className="font-black text-inkBlack">{restaurant.name}</h3>
                      <p className="text-xs text-inkBlack/50">{restaurant.city} &middot; EpicScore: {restaurant.epicScore}</p>
                      <p className="text-xs text-inkBlack/30 mt-0.5">Laatste sync: {lastUpdated}</p>
                    </div>
                    <button
                      onClick={() => handleSync(restaurant.id)}
                      disabled={state?.loading}
                      className={`shrink-0 px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                        ${state?.loading
                          ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                          : 'bg-epicRed text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        }`}
                    >
                      {state?.loading ? '⏳ Bezig...' : '🔄 Sync'}
                    </button>
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
