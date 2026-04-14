'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Restaurant, City } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import CityFilter from '@/components/CityFilter'
import Mascot from '@/components/Mascot'
import WhySheet from '@/components/WhySheet'
import DumplingMandje from '@/components/DumplingMandje'

const RestaurantMapDynamic = dynamic(() => import('@/components/RestaurantMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60vh] rounded-2xl border-[3px] border-inkBlack flex items-center justify-center bg-inkBlack/5">
      <p className="text-sm font-black text-inkBlack/40">Kaart laden...</p>
    </div>
  ),
})

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortByDistance, setSortByDistance] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

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

  const handleLocation = () => {
    if (sortByDistance) {
      setSortByDistance(false)
      return
    }
    if (userLocation) {
      setSortByDistance(true)
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSortByDistance(true)
        setLocationLoading(false)
      },
      () => { setLocationLoading(false) }
    )
  }

  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const handleSurpriseMe = () => {
    if (restaurants.length === 0) return
    const random = restaurants[Math.floor(Math.random() * restaurants.length)]
    router.push(`/restaurant/${random.id}`)
  }

  const availableCities = useMemo(() => {
    const citySet = new Set(restaurants.map(r => r.city))
    return Array.from(citySet) as City[]
  }, [restaurants])

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

  const sortedRestaurants = useMemo(() => {
    if (sortByDistance && userLocation) {
      return [...filtered].sort((a, b) => {
        const distA = a.coords
          ? getDistance(userLocation.lat, userLocation.lng, a.coords.lat, a.coords.lng)
          : 999
        const distB = b.coords
          ? getDistance(userLocation.lat, userLocation.lng, b.coords.lat, b.coords.lng)
          : 999
        return distA - distB
      })
    }
    return [...filtered].sort((a, b) => (b.epicScore ?? 0) - (a.epicScore ?? 0))
  }, [filtered, sortByDistance, userLocation])

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
      {/* WHY statement */}
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
      <CityFilter selected={selectedCity} onChange={setSelectedCity} availableCities={availableCities} />

      {/* Product promise */}
      <p className="text-xs text-inkBlack/40 font-medium text-center -mt-1">
        Alleen geverifieerde dim sum spots — kwaliteit boven kwantiteit
      </p>

      {/* Location button — full width */}
      <button
        onClick={handleLocation}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-sm font-black transition-all active:scale-95 ${
          sortByDistance
            ? 'bg-inkBlack text-cream border-inkBlack shadow-brutal-sm'
            : 'bg-cream text-inkBlack border-inkBlack/20 hover:bg-inkBlack/5'
        }`}
      >
        <Image src="/mascots/dumpling-pin.png" alt="locatie" width={18} height={18} className="object-contain" />
        {locationLoading ? 'Zoeken...' : sortByDistance ? "Gao's picks nabij jou — klik om uit te zetten" : 'Laat spots bij mij in de buurt zien'}
      </button>

      {sortByDistance && (
        <p className="text-[10px] text-inkBlack/40 font-bold text-center -mt-2">
          Gesorteerd op afstand · alleen door Gao goedgekeurde spots
        </p>
      )}

      {/* Sort control + view toggle + Surprise Me */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-inkBlack/40 font-bold uppercase tracking-wide">Sorteren:</span>
        {[
          { value: 'epic', label: 'Beste overall' },
          { value: 'hagao', label: 'Ha Gao' },
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
        <div className="ml-auto flex items-center gap-1 bg-inkBlack/5 border border-inkBlack/10 rounded-xl p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-inkBlack text-cream' : 'text-inkBlack/50'
            }`}
          >
            Lijst
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
              viewMode === 'map' ? 'bg-inkBlack text-cream' : 'text-inkBlack/50'
            }`}
          >
            Kaart
          </button>
        </div>
        <button
          onClick={handleSurpriseMe}
          className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border-2 border-inkBlack/20 bg-cream hover:bg-epicRed/10 transition-all active:scale-95"
        >
          <Image src="/mascots/hilarischgao.png" alt="Surprise" width={18} height={18} className="object-contain" />
          Verras me!
        </button>
      </div>

      {/* Permanent explainer */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-epicRed/8 border border-epicRed/20 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Image src="/mascots/Epicscore.png" alt="EpicScore" width={16} height={16} className="object-contain" />
            <p className="text-[10px] font-black text-epicRed uppercase tracking-wide">EpicScore™</p>
          </div>
          <p className="text-[11px] text-inkBlack/60 leading-snug">
            Gebaseerd op dumplingkwaliteit, niet populariteit
          </p>
        </div>
        <div className="bg-epicGreen/8 border border-epicGreen/20 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Image src="/mascots/HaGaoIndex.png" alt="Ha Gao" width={16} height={16} className="object-contain" />
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

      {/* Restaurant cards / map */}
      {filtered.length > 0 ? (
        <>
          {viewMode === 'map' ? (
            <RestaurantMapDynamic
              restaurants={sortedRestaurants}
              userLocation={userLocation ?? undefined}
              onRestaurantClick={(id) => {
                const params = new URLSearchParams(searchParams.toString())
                window.location.href = `/restaurant/${id}${params.size > 0 ? '?' + params.toString() : ''}`
              }}
            />
          ) : (
          <div className="space-y-3">
            {sortedRestaurants.map((restaurant, index) => {
              const distance = sortByDistance && userLocation && restaurant.coords
                ? getDistance(userLocation.lat, userLocation.lng, restaurant.coords.lat, restaurant.coords.lng)
                : undefined
              return (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  rank={index + 1}
                  currentCity={selectedCity}
                  distance={distance}
                />
              )
            })}
          </div>
          )}


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
          <div id="suggest-form" className="mt-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white">
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
        <div className="text-center py-16 flex flex-col items-center gap-4">
          <Image
            src="/mascots/sleepy.png"
            alt="Gao is aan het speuren"
            width={72}
            height={72}
            className="object-contain"
          />
          <div>
            <p className="font-black text-inkBlack/60">
              Gao is hier nog aan het speuren
            </p>
            <p className="text-xs text-inkBlack/30 mt-1 max-w-xs mx-auto leading-relaxed">
              Hij weet zeker dat er dim sum parels verstopt zitten.
              Hij vindt ze. Dat beloven we.
            </p>
          </div>
          <Link
            href="/reis"
            className="text-xs font-black text-epicGreen border border-epicGreen/30 px-3 py-1.5 rounded-full"
          >
            Ken jij een parel? →
          </Link>
        </div>
      )}

      {/* bottom padding so last card isn't hidden behind floating button */}
      <div className="h-20" />
    </div>

    {/* floating WHY button */}
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <button
        onClick={() => setShowWhySheet(true)}
        className="pointer-events-auto flex items-center gap-2 bg-inkBlack/90 text-cream px-4 py-2.5 rounded-full text-xs font-black border border-inkBlack/20 shadow-lg active:scale-95 transition-transform"
      >
        <Image src="/mascots/MasterGao.png" alt="Gao" width={20} height={20} className="object-contain shrink-0" />
        Waarom anders dan Google?
      </button>
    </div>
    </>
  )
}
