'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Restaurant, City } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import CityFilter from '@/components/CityFilter'
import Mascot from '@/components/Mascot'
import WhySheet from '@/components/WhySheet'
import DumplingMandje from '@/components/DumplingMandje'

interface RestaurantFeedProps {
  restaurants: Restaurant[]
}

const MAX_PER_CITY = 15

export default function RestaurantFeed({ restaurants }: RestaurantFeedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedCity = (searchParams.get('city') as City | 'Alle') ?? 'Alle'

  const setSelectedCity = (city: City | 'Alle') => {
    const params = new URLSearchParams(searchParams.toString())
    if (city === 'Alle') {
      params.delete('city')
    } else {
      params.set('city', city)
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'epic' | 'hagao'>('epic')
  const [showWhySheet, setShowWhySheet] = useState(false)
  const [suggestUrl, setSuggestUrl] = useState('')
  const [suggestState, setSuggestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [suggestMessage, setSuggestMessage] = useState('')

  const handleSuggest = async () => {
    if (!suggestUrl.trim()) return
    setSuggestState('loading')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapsUrl: suggestUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fout')
      setSuggestState('success')
      setSuggestMessage(data.message)
      setSuggestUrl('')
    } catch (err) {
      setSuggestState('error')
      setSuggestMessage(err instanceof Error ? err.message : 'Er ging iets mis')
    }
  }

  const filtered = useMemo(() => {
    let list = restaurants
    if (selectedCity !== 'Alle') {
      list = list.filter((r) => r.city === selectedCity)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.mustOrder?.toLowerCase().includes(q) ?? false)
      )
    }

    const sorted = [...list].sort((a, b) =>
      sortBy === 'hagao'
        ? b.haGaoIndex - a.haGaoIndex
        : b.epicScore - a.epicScore
    )

    // Global top 15 across all cities — best overall
    return sorted.slice(0, MAX_PER_CITY)
  }, [restaurants, selectedCity, searchQuery, sortBy])

  const cityLabel = selectedCity === 'Alle' ? 'Nederland' : selectedCity

  const countText = selectedCity === 'Alle'
    ? `De beste dim sum spots in Nederland`
    : filtered.length === 0
      ? `Nog geen geverifieerde spots in ${cityLabel}`
      : filtered.length === 1
        ? `1 geverifieerde dim sum spot in ${cityLabel}`
        : `${filtered.length} geverifieerde dim sum spots in ${cityLabel}`

  return (
    <>
    <WhySheet isOpen={showWhySheet} onClose={() => setShowWhySheet(false)} />

    <div className="space-y-4">
      {/* Fix D: WHY statement */}
      <div className="text-center pb-1">
        <p className="text-xs font-black text-inkBlack/60 tracking-wide">
          Niet de populairste dim sum —{' '}
          <span className="text-epicRed">de beste dumplings</span>
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-inkBlack/40 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="search"
          placeholder="Zoek op restaurant, stad of gerecht..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-full border-[3px] border-inkBlack shadow-brutal-md bg-white text-sm font-medium placeholder:text-inkBlack/40 focus:outline-none focus:ring-0 focus:shadow-brutal transition-shadow"
        />
      </div>

      {/* City filter */}
      <CityFilter selected={selectedCity} onChange={setSelectedCity} />

      {/* Product promise */}
      <p className="text-xs text-inkBlack/40 font-medium text-center -mt-1">
        Alleen geverifieerde dim sum spots — kwaliteit boven kwantiteit
      </p>

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-inkBlack/40 font-bold uppercase tracking-wide">Sorteren:</span>
        {[
          { value: 'epic', label: 'Beste overall' },
          { value: 'hagao', label: '🥟 Ha Gao' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value as 'epic' | 'hagao')}
            className={`text-xs font-black px-3 py-1 rounded-full border-2 border-inkBlack transition-all ${
              sortBy === opt.value
                ? 'bg-inkBlack text-cream'
                : 'bg-cream text-inkBlack active:bg-inkBlack/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Permanent explainer */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-epicRed/8 border border-epicRed/20 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <img src="/mascots/Epicscore.png" alt="EpicScore" className="w-4 h-4 object-contain" />
            <p className="text-[10px] font-black text-epicRed uppercase tracking-wide">EpicScore™</p>
          </div>
          <p className="text-[11px] text-inkBlack/60 leading-snug">
            Gebaseerd op dumplingkwaliteit, niet populariteit
          </p>
        </div>
        <div className="bg-epicGreen/8 border border-epicGreen/20 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <img src="/mascots/HaGaoIndex.png" alt="Ha Gao" className="w-4 h-4 object-contain" />
            <p className="text-[10px] font-black text-epicGreen uppercase tracking-wide">Ha Gao Index</p>
          </div>
          <p className="text-[11px] text-inkBlack/60 leading-snug">
            De ultieme dumplingtest — hier bewijst een keuken zich
          </p>
        </div>
      </div>

      {/* Dumpling Mandje */}
      <DumplingMandje />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-inkBlack/50">{countText}</p>
        <p className="text-xs text-inkBlack/30">
          {sortBy === 'hagao' ? 'Ha Gao Index' : 'EpicScore'}
        </p>
      </div>

      {/* Restaurant cards */}
      {filtered.length > 0 ? (
        <>
          <div className="space-y-3">
            {filtered.map((restaurant, index) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} rank={index + 1} currentCity={selectedCity} />
            ))}
          </div>

          {/* Gao sticker banner */}
          <div className="mt-8 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mascot type="happy" size={48} />
              <div>
                <p className="font-black text-sm text-inkBlack">Ontmoet Gao 🥟</p>
                <p className="text-xs text-inkBlack/60">De officiële EpicDimSum dumpling judge</p>
              </div>
            </div>
            <a
              href="/mascots/top1.png"
              download="gao-epicdimsum.png"
              className="text-xs font-black bg-inkBlack text-cream px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm hover:bg-epicRed transition-colors whitespace-nowrap"
            >
              Download sticker ↓
            </a>
          </div>

          {/* Suggest a restaurant */}
          <div className="mt-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white">
            <p className="font-black text-sm mb-1">🥟 Ken jij een goede plek?</p>
            <p className="text-xs text-inkBlack/50 mb-3">Plak een Google Maps link — wij doen de rest</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={suggestUrl}
                onChange={(e) => { setSuggestUrl(e.target.value); setSuggestState('idle') }}
                placeholder="https://maps.google.com/..."
                className="flex-1 text-xs px-3 py-2 rounded-full border-2 border-inkBlack focus:outline-none"
              />
              <button
                onClick={handleSuggest}
                disabled={suggestState === 'loading' || !suggestUrl.trim()}
                className="text-xs font-black px-3 py-2 rounded-full bg-epicGreen text-cream border-2 border-inkBlack shadow-brutal-sm disabled:opacity-50 transition-colors"
              >
                {suggestState === 'loading' ? '…' : 'Voeg toe →'}
              </button>
            </div>
            {suggestMessage && (
              <p className={`text-xs mt-2 font-medium ${suggestState === 'error' ? 'text-epicRed' : 'text-epicGreen'}`}>
                {suggestMessage}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <Mascot type="saddenedgao" size={80} alt="Geen resultaten" />
          <p className="font-black text-inkBlack/50">Geen dim sum gevonden…</p>
          <p className="text-sm text-inkBlack/30">probeer een andere stad of zoekterm</p>
        </div>
      )}

      {/* Fix E: bottom padding so last card isn't hidden behind floating button */}
      <div className="h-20" />
    </div>

    {/* Fix E: floating WHY button */}
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <button
        onClick={() => setShowWhySheet(true)}
        className="pointer-events-auto flex items-center gap-2 bg-inkBlack/90 text-cream px-4 py-2.5 rounded-full text-xs font-black border border-inkBlack/20 shadow-lg active:scale-95 transition-transform"
      >
        <img src="/mascots/MasterGao.png" alt="Gao" className="w-5 h-5 object-contain shrink-0" />
        Waarom anders dan Google?
      </button>
    </div>
    </>
  )
}
