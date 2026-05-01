'use client'

import { useState } from 'react'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { isTrustedForPublicFeed } from '@/lib/db'
import Mascot from '@/components/Mascot'

interface SyncState {
  loading: boolean
  result: Restaurant | null
  error: string | null
}

interface RestaurantsSectionProps {
  secret: string
  restaurants: Restaurant[]
  onUpdate: (id: string, patch: Partial<Restaurant>) => void
  onRemove: (id: string) => void
  onAdd: (r: Restaurant) => void
}

function humanizeError(error: string): string {
  if (error === 'Unauthorized') return 'Verkeerd wachtwoord, check je Sync Secret'
  return error
}

type SourceFilter = 'alle' | 'gebruiker' | 'engine' | 'seed'

const CITY_OPTIONS: City[] = [
  'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Arnhem',
  'Eindhoven', 'Groningen', 'Leeuwarden', 'Lelystad', 'Maastricht',
  'Middelburg', 'Assen', 'Zwolle', "'s-Hertogenbosch",
]

export default function RestaurantsSection({
  secret,
  restaurants,
  onUpdate,
  onRemove,
  onAdd,
}: RestaurantsSectionProps) {
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({})
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('alle')
  const [showAll, setShowAll] = useState(false)

  // Inline delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

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
      onUpdate(restaurantId, data)
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

  const startDelete = (id: string) => {
    setDeletingId(id)
    setDeleteInput('')
    setDeleteError(null)
  }

  const cancelDelete = () => {
    setDeletingId(null)
    setDeleteInput('')
    setDeleteError(null)
  }

  const confirmDelete = async (r: Restaurant) => {
    if (deleteInput.trim() !== r.name) return
    setDeleteBusy(true)
    setDeleteError(null)
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
      setDeletingId(null)
      setDeleteInput('')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/verify/${id}`, {
        method: 'POST',
        headers: { 'x-sync-secret': secret },
      })
      if (res.ok) {
        onUpdate(id, { verified: true })
        setSyncStates((prev) => ({
          ...prev,
          [id]: prev[id]
            ? { ...prev[id], result: prev[id].result ? { ...prev[id].result!, verified: true } : null }
            : prev[id],
        }))
      }
    } catch {
      /* skip */
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
      onAdd(data)
      setAddForm({ placeId: '', name: '', city: 'Amsterdam', priceRange: '€€' })
    } catch (err) {
      setAddState({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  // Apply filters
  const matchesSource = (r: Restaurant): boolean => {
    if (sourceFilter === 'alle') return true
    if (sourceFilter === 'gebruiker') {
      return r.source === 'user' || (r.source === undefined && r.status === 'suggested')
    }
    if (sourceFilter === 'engine') return r.source === 'engine'
    // seed: treat undefined/null as seed (legacy records)
    return r.source === 'seed' || !r.source
  }

  const visibleRestaurants = restaurants
    .filter((r) => (showAll ? true : r.verified === true))
    .filter(matchesSource)

  const counts = {
    alle: restaurants.length,
    gebruiker: restaurants.filter((r) => r.source === 'user' || (r.source === undefined && r.status === 'suggested')).length,
    engine: restaurants.filter((r) => r.source === 'engine').length,
    seed: restaurants.filter((r) => r.source === 'seed' || !r.source).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mascot type="judge" size={36} alt="Gao de dumpling judge" />
          <div className="flex-1">
            <h2 className="font-black text-lg text-inkBlack">Restaurants</h2>
            <p className="text-xs text-inkBlack/50">
              {showAll ? 'Alle restaurants' : 'Alleen geverifieerde'} ({visibleRestaurants.length})
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-inkBlack/70 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4 accent-epicRed"
            />
            Toon alles
          </label>
        </div>

        {/* Source filter */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {(['alle', 'gebruiker', 'engine', 'seed'] as const).map((f) => {
            const label =
              f === 'alle' ? 'Alle'
              : f === 'gebruiker' ? '🧺 Gebruiker'
              : f === 'engine' ? '⚙️ Engine'
              : '🌱 Seed'
            return (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`text-xs font-black px-3 py-1 rounded-full border-2 border-inkBlack transition-colors ${
                  sourceFilter === f ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack/60 hover:text-inkBlack'
                }`}
              >
                {label} ({counts[f]})
              </button>
            )
          })}
        </div>

        <div className="space-y-4">
          {visibleRestaurants.length === 0 && (
            <div className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-8 text-center">
              <p className="text-sm text-inkBlack/50 font-bold">Geen restaurants in deze view.</p>
            </div>
          )}

          {visibleRestaurants.map((restaurant) => {
            const state = syncStates[restaurant.id]
            const lastUpdated = restaurant.sources?.lastUpdated
              ? new Date(restaurant.sources.lastUpdated).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })
              : '—'
            const isDeleting = deletingId === restaurant.id
            const canConfirmDelete = deleteInput.trim() === restaurant.name
            const displayed = state?.result ?? restaurant

            return (
              <div
                key={restaurant.id}
                className="rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-inkBlack">{restaurant.name}</h3>
                      {restaurant.source === 'user' && (
                        <span className="text-[10px] font-black bg-epicPurple/15 text-epicPurple border border-epicPurple/30 rounded-full px-2 py-0.5">
                          🧺 Gebruiker
                        </span>
                      )}
                      {restaurant.source === 'engine' && (
                        <span className="text-[10px] font-black bg-inkBlack/10 text-inkBlack/70 border border-inkBlack/20 rounded-full px-2 py-0.5">
                          🤖 Engine
                        </span>
                      )}
                      {(restaurant.source === 'seed' || !restaurant.source) && (
                        <span className="text-[10px] font-black bg-epicGreen/10 text-epicGreen border border-epicGreen/30 rounded-full px-2 py-0.5">
                          🌱 Seed
                        </span>
                      )}
                      {displayed.verified === true && (
                        <span className="text-[10px] font-black bg-epicGreen/20 text-epicGreen border border-epicGreen/40 rounded-full px-2 py-0.5">
                          ✓ Geverifieerd
                        </span>
                      )}
                      {displayed.verified === false && (
                        <span className="text-[10px] font-black bg-epicRed/10 text-epicRed border border-epicRed/30 rounded-full px-2 py-0.5">
                          🚩 Onverifieerd
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-inkBlack/50">
                      {restaurant.city} · EpicScore: {displayed.epicScore}
                    </p>
                    {(() => {
                      if (isTrustedForPublicFeed(displayed)) return null
                      const gates: string[] = []
                      if ((displayed.dumplingMentionScore ?? 0) < 15) gates.push('geen dumpling mentions')
                      if ((displayed.haGaoIndex ?? 0) < 2.0) gates.push('Ha Gao te laag')
                      if (displayed.epicScore < 20) gates.push('score te laag')
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
                        disabled={state?.loading || isDeleting}
                        className={`px-4 py-2 rounded-full border-2 border-inkBlack font-black text-sm shadow-brutal-sm transition-all
                          ${state?.loading
                            ? 'bg-inkBlack/10 text-inkBlack/40 cursor-not-allowed shadow-none'
                            : 'bg-epicRed text-cream hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                          }`}
                      >
                        {state?.loading ? '⏳' : '🔄 Sync'}
                      </button>
                      <button
                        onClick={() => startDelete(restaurant.id)}
                        disabled={isDeleting}
                        className="text-xs font-black px-2 py-1 rounded-lg border-2 border-red-300 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </div>
                    {displayed.verified !== true && (
                      <button
                        onClick={() => handleVerify(restaurant.id)}
                        className="px-3 py-1.5 rounded-full border-2 border-inkBlack font-black text-xs bg-epicGreen text-cream shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                      >
                        ✓ Verifieer
                      </button>
                    )}
                  </div>
                </div>

                {isDeleting && (
                  <div className="mt-3 p-3 rounded-xl bg-epicRed/5 border-2 border-epicRed/40 space-y-2">
                    <p className="text-xs font-bold text-epicRed">
                      Weet je het zeker? Typ de naam om te bevestigen.
                    </p>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Typ naam om te bevestigen"
                      className="w-full px-3 py-2 rounded-xl border-2 border-inkBlack text-sm font-medium bg-white focus:outline-none shadow-brutal-sm"
                      autoFocus
                    />
                    <p className="text-[10px] text-inkBlack/40">
                      Verwacht: <span className="font-black">{restaurant.name}</span>
                    </p>
                    {deleteError && (
                      <p className="text-xs text-epicRed font-bold">{deleteError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmDelete(restaurant)}
                        disabled={!canConfirmDelete || deleteBusy}
                        className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-epicRed text-cream disabled:opacity-30 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                      >
                        {deleteBusy ? '⏳ Bezig...' : 'Definitief verwijderen'}
                      </button>
                      <button
                        onClick={cancelDelete}
                        disabled={deleteBusy}
                        className="text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm bg-cream text-inkBlack disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                      >
                        Annuleer
                      </button>
                    </div>
                  </div>
                )}

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
                {CITY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
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
                <option value="€">€ Budget</option>
                <option value="€€">€€ Midden</option>
                <option value="€€€">€€€ Luxe</option>
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
    </div>
  )
}
