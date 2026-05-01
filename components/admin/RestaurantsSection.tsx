'use client'

import { useState } from 'react'
import { Restaurant, City, PriceRange, CITY_LIST } from '@/lib/types'
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

type PublishFilter = 'alle' | 'publiek' | 'niet-publiek'
type CityFilter = City | 'all'
type SortMode = 'score' | 'name'

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
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('alle')
  const [cityFilter, setCityFilter] = useState<CityFilter>('all')
  const [sortBy, setSortBy] = useState<SortMode>('score')

  // Optimistic publish/hide error state per restaurant
  const [publishError, setPublishError] = useState<Record<string, string>>({})

  // Inline delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
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

  // Optimistic: flip the UI immediately, then call API. Revert on failure.
  const handleSetVerified = async (r: Restaurant, verified: boolean) => {
    setPublishError((s) => ({ ...s, [r.id]: '' }))
    onUpdate(r.id, { verified }) // optimistic

    try {
      const res = await fetch(`/api/admin/verify/${r.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': secret,
        },
        body: JSON.stringify({ verified }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
    } catch (err) {
      // Revert optimistic update
      onUpdate(r.id, { verified: !verified })
      setPublishError((s) => ({
        ...s,
        [r.id]: err instanceof Error ? err.message : 'Wijzigen mislukt',
      }))
    }
  }

  const startDelete = (id: string) => {
    setDeletingId(id)
    setDeleteInput('')
    setDeleteReason('')
    setDeleteError(null)
  }

  const cancelDelete = () => {
    setDeletingId(null)
    setDeleteInput('')
    setDeleteReason('')
    setDeleteError(null)
  }

  const confirmDelete = async (r: Restaurant) => {
    if (deleteInput.trim() !== r.name) return
    setDeleteBusy(true)
    setDeleteError(null)
    const reason = deleteReason.trim()
    try {
      const res = await fetch(`/api/admin/delete/${r.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': secret,
        },
        body: JSON.stringify({ reason: reason.length > 0 ? reason : undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(humanizeError(err.error || `HTTP ${res.status}`))
      }
      onRemove(r.id)
      setDeletingId(null)
      setDeleteInput('')
      setDeleteReason('')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setDeleteBusy(false)
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

  // Compute counts on the full list
  const counts = {
    alle: restaurants.length,
    publiek: restaurants.filter((r) => r.verified === true).length,
    'niet-publiek': restaurants.filter((r) => r.verified !== true).length,
  }

  // Filter pipeline
  const publishFiltered = restaurants.filter((r) => {
    if (publishFilter === 'publiek') return r.verified === true
    if (publishFilter === 'niet-publiek') return r.verified !== true
    return true
  })

  const cityCounts: Record<string, number> = {}
  for (const r of publishFiltered) {
    const key = (r.city as string) ?? '—'
    cityCounts[key] = (cityCounts[key] ?? 0) + 1
  }

  const visibleRestaurants = publishFiltered
    .filter((r) => (cityFilter === 'all' ? true : r.city === cityFilter))
    .slice()
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'nl')
      return (b.epicScore ?? 0) - (a.epicScore ?? 0)
    })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mascot type="judge" size={36} alt="Gao de dumpling judge" />
          <div className="flex-1">
            <h2 className="font-black text-lg text-inkBlack">Restaurants</h2>
            <p className="text-xs text-inkBlack/50">
              Curatie-overzicht ({visibleRestaurants.length})
            </p>
          </div>
        </div>

        {/* Publish filter */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {(['alle', 'publiek', 'niet-publiek'] as const).map((f) => {
            const label =
              f === 'alle' ? 'Alle'
              : f === 'publiek' ? '🟢 Publiek'
              : 'Niet publiek'
            return (
              <button
                key={f}
                onClick={() => setPublishFilter(f)}
                className={`text-xs font-black px-3 py-1 rounded-full border-2 border-inkBlack transition-colors ${
                  publishFilter === f ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack/60 hover:text-inkBlack'
                }`}
              >
                {label} ({counts[f]})
              </button>
            )
          })}
        </div>

        {/* City filter + sort */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value as CityFilter)}
            className="text-xs font-black px-3 py-1.5 rounded-full border-2 border-inkBlack bg-cream text-inkBlack focus:outline-none"
          >
            <option value="all">Alle steden ({publishFiltered.length})</option>
            {CITY_LIST.map((city) => (
              <option key={city} value={city}>
                {city} ({cityCounts[city] ?? 0})
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="text-xs font-black px-3 py-1.5 rounded-full border-2 border-inkBlack bg-cream text-inkBlack focus:outline-none"
          >
            <option value="score">EpicScore (hoog → laag)</option>
            <option value="name">Naam (A → Z)</option>
          </select>
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
            const isPublic = displayed.verified === true
            const pubErr = publishError[restaurant.id]

            return (
              <div
                key={restaurant.id}
                className={`rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4 border-l-[6px] ${
                  isPublic ? 'border-l-epicGreen' : 'border-l-inkBlack/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-inkBlack">{restaurant.name}</h3>
                      {isPublic ? (
                        <span className="text-[10px] font-black bg-epicGreen/15 text-epicGreen border border-epicGreen/40 rounded-full px-2 py-0.5">
                          🟢 Publiek
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-inkBlack/8 text-inkBlack/50 border border-inkBlack/20 rounded-full px-2 py-0.5">
                          Niet publiek
                        </span>
                      )}
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
                      {restaurant.agentReason && (
                        <span
                          title={restaurant.agentReason}
                          className="text-[10px] font-black bg-epicRed/10 text-epicRed border border-epicRed/30 rounded-full px-2 py-0.5"
                        >
                          🚩 Geflagd
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-inkBlack/50">
                      {restaurant.city} · EpicScore: {displayed.epicScore}
                    </p>
                    <p className="text-xs text-inkBlack/30 mt-0.5">Laatste sync: {lastUpdated}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isPublic ? (
                      <button
                        onClick={() => handleSetVerified(restaurant, false)}
                        className="px-3 py-2 rounded-full border-2 border-inkBlack font-black text-xs bg-cream text-inkBlack shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                      >
                        ✕ Verberg
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetVerified(restaurant, true)}
                        className="px-3 py-2 rounded-full border-2 border-inkBlack font-black text-xs bg-epicGreen text-cream shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                      >
                        ✓ Publiceer
                      </button>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleSync(restaurant.id)}
                        disabled={state?.loading || isDeleting}
                        className={`px-3 py-1.5 rounded-full border-2 border-inkBlack font-black text-xs shadow-brutal-sm transition-all
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
                  </div>
                </div>

                {pubErr && (
                  <div className="mt-2 p-2 rounded-lg bg-epicRed/10 border border-epicRed/30 text-xs text-epicRed font-medium">
                    {pubErr}
                  </div>
                )}

                {restaurant.agentReason && (
                  <p className="text-[11px] text-epicRed/80 mt-1.5">
                    <span className="font-black">Agent:</span> {restaurant.agentReason}
                  </p>
                )}

                {isDeleting && (
                  <div className="mt-3 p-3 rounded-xl bg-epicRed/5 border-2 border-epicRed/40 space-y-2">
                    <p className="text-xs font-bold text-epicRed">
                      Weet je het zeker? Typ de naam om te bevestigen.
                    </p>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wide text-inkBlack/50 mb-1 block">
                        Waarom niet? (optioneel)
                      </label>
                      <input
                        type="text"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="geen dim sum / kwaliteit te laag"
                        maxLength={200}
                        className="w-full px-3 py-2 rounded-xl border-2 border-inkBlack/40 text-sm font-medium bg-white focus:outline-none shadow-brutal-sm"
                      />
                    </div>
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
            Engine doet de sync. Restaurant verschijnt hieronder maar is{' '}
            <span className="font-black">niet publiek</span> tot je &ldquo;Publiceer&rdquo; klikt.
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
              <p className="text-[11px] text-inkBlack/60">
                Niet publiek — gebruik &ldquo;Publiceer&rdquo; hierboven om hem live te zetten.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
