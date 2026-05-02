'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Restaurant, City, CITY_LIST } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import CityFilter from '@/components/CityFilter'
import Mascot from '@/components/Mascot'
import DumplingMandje from '@/components/DumplingMandje'
import JourneyCard from '@/components/JourneyCard'
import { createClient } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

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
  const [suggestName, setSuggestName] = useState('')
  const [suggestCity, setSuggestCity] = useState('')
  const [suggestNote, setSuggestNote] = useState('')
  const [suggestState, setSuggestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortByDistance, setSortByDistance] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showMandje, setShowMandje] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkinCount, setCheckinCount] = useState(0)
  const [cityCount, setCityCount] = useState(0)
  const [journeyMessage, setJourneyMessage] = useState('')
  const [introDismissed, setIntroDismissed] = useState(true)
  const [showSuggestFAB, setShowSuggestFAB] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const records: { city: string; restaurantId: string }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('checkin_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data)
            if (parsed.restaurantId) records.push(parsed)
          }
        } catch { /* skip */ }
      }
    }
    const cities = new Set(records.map(r => r.city))
    setCheckinCount(records.length)
    setCityCount(cities.size)
    if (records.length === 0) setJourneyMessage('')
    else if (records.length < 3) setJourneyMessage('De reis is begonnen')
    else if (records.length < 5) setJourneyMessage('Gao begint je te kennen')
    else if (cities.size >= 3) setJourneyMessage('Gao ziet dat je op ontdekkingstocht bent')
    else setJourneyMessage('Gao ziet dat je serieus bent')
    if (localStorage.getItem('gao-intro-dismissed') !== 'true') {
      setIntroDismissed(false)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const formEl = document.getElementById('suggest-form')
      if (!formEl) { setShowSuggestFAB(false); return }
      const formTop = formEl.getBoundingClientRect().top
      const scrolledPast2Cards = window.scrollY > 400
      const nearForm = formTop < window.innerHeight + 300
      setShowSuggestFAB(scrolledPast2Cards && !nearForm)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSuggest = async () => {
    const name = suggestName.trim()
    const city = suggestCity.trim()
    if (!name || !city) return
    setSuggestState('loading')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          city,
          note: suggestNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('network')
      setSuggestState('success')
      setSuggestName('')
      setSuggestCity('')
      setSuggestNote('')
    } catch {
      setSuggestState('error')
    }
  }

  const resetSuggest = () => {
    setSuggestState('idle')
    setSuggestName('')
    setSuggestCity('')
    setSuggestNote('')
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
    ? `De beste dim sum plekken, gevonden via hun dumplings`
    : filtered.length === 0
      ? `Nog geen geverifieerde spots in ${cityLabel}`
      : filtered.length === 1
        ? `1 geverifieerde dim sum spot in ${cityLabel}`
        : `${filtered.length} geverifieerde dim sum spots in ${cityLabel}`

  return (
    <>
    <div className="space-y-4">
      {/* WHY statement */}
      <div className="text-center pb-1">
        <p className="text-sm font-black text-inkBlack">De beste dim sum plekken in Nederland</p>
        <p className="text-xs text-inkBlack/50 mt-0.5">Handpicked door liefhebbers, geanalyseerd door Gao</p>
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
        Alleen geverifieerde dim sum spots, kwaliteit boven kwantiteit
      </p>

      {/* Control bar — horizontally scrollable, never wraps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 mb-2">

        {/* Sort: Beste overall */}
        <button
          onClick={() => setSortBy('epic')}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border-[3px] border-inkBlack px-3 py-1.5 text-xs font-black transition-all ${
            sortBy === 'epic' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
          }`}
        >
          Beste overall
        </button>

        {/* Sort: Ha Gao */}
        <button
          onClick={() => setSortBy('hagao')}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border-[3px] border-inkBlack px-3 py-1.5 text-xs font-black transition-all ${
            sortBy === 'hagao' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
          }`}
        >
          <Image src="/mascots/HaGaoIndex.png" alt="" width={14} height={14} className="object-contain" />
          Ha Gao
        </button>

        {/* Location */}
        <button
          onClick={handleLocation}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border-[3px] border-inkBlack px-3 py-1.5 text-xs font-black transition-all ${
            sortByDistance ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
          }`}
        >
          <Image src="/mascots/dumpling-pin.png" alt="" width={14} height={14} className="object-contain" />
          {locationLoading ? '...' : sortByDistance ? 'Nabij jou' : 'In jouw buurt'}
        </button>

        {/* Divider */}
        <div className="shrink-0 w-px h-5 bg-inkBlack/20" />

        {/* List/Map toggle */}
        <div className="shrink-0 flex rounded-full border-[3px] border-inkBlack overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-black transition-colors ${
              viewMode === 'list' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
            }`}
          >
            Lijst
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 text-xs font-black transition-colors ${
              viewMode === 'map' ? 'bg-inkBlack text-cream' : 'bg-cream text-inkBlack'
            }`}
          >
            Kaart
          </button>
        </div>

        {/* Divider */}
        <div className="shrink-0 w-px h-5 bg-inkBlack/20" />

        {/* Surprise Me — with label */}
        <button
          onClick={handleSurpriseMe}
          className="shrink-0 flex items-center gap-1.5 rounded-full border-[3px] border-inkBlack bg-cream px-3 py-1.5 text-xs font-black active:scale-95 transition-transform"
        >
          <Image src="/mascots/hilarischgao.png" alt="Verras me" width={18} height={18} className="object-contain" />
          Verras me!
        </button>

      </div>

      {/* Intro card — first-use guidance */}
      {checkinCount === 0 && !introDismissed && (
        <div className="bg-[#fff3d6] border-[3px] border-inkBlack shadow-brutal rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/mascots/MasterGao.png"
              alt="Master Gao"
              width={40}
              height={40}
              className="object-contain shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm leading-tight">Welkom bij EpicDimSum</p>
              <p className="text-xs text-inkBlack/60 mt-0.5 leading-snug">
                Gao heeft de beste dim sum plekken van Nederland gevonden
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setIntroDismissed(true)
                document.getElementById('restaurant-list')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex-1 bg-inkBlack text-cream text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm"
            >
              Bekijk plekken
            </button>
            <button
              onClick={() => {
                localStorage.setItem('gao-intro-dismissed', 'true')
                setIntroDismissed(true)
              }}
              className="flex-1 bg-white text-inkBlack text-xs font-black px-3 py-2 rounded-full border-2 border-inkBlack shadow-brutal-sm"
            >
              Ik kijk eerst rond
            </button>
          </div>
        </div>
      )}

      {/* Journey card — personal, between controls and list */}
      <JourneyCard
        user={user}
        checkinCount={checkinCount}
        cityCount={cityCount}
        gaoMessage={journeyMessage}
        onOpen={() => setShowMandje(true)}
      />
      <DumplingMandje open={showMandje} onClose={() => setShowMandje(false)} />

      {/* Results count */}
      <div className="flex items-end justify-between gap-3 mb-4 mt-2">
        <p className="text-sm font-bold text-inkBlack/50">{countText}</p>
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
          <div id="restaurant-list" className="space-y-5">
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


          {/* Suggest a restaurant */}
          <div id="suggest-form" className="mt-8 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-white p-4">
            {suggestState === 'success' ? (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <Image
                  src="/mascots/GaoMandje.png"
                  alt="Gao bedankt je"
                  width={64}
                  height={64}
                  className="object-contain"
                />
                <p className="font-black text-sm text-inkBlack">
                  Dank je! Gao gaat deze plek bekijken. 🥟
                </p>
                <button
                  onClick={resetSuggest}
                  className="text-xs font-black px-4 py-2 rounded-full bg-white text-inkBlack border-2 border-inkBlack shadow-brutal-sm"
                >
                  Nog een plek toevoegen
                </button>
              </div>
            ) : (
              <>
                <p className="font-black text-sm mb-1">Ken jij een goede plek? 🥟</p>
                <p className="text-xs text-inkBlack/50 mb-4">Tip Gao een restaurant — hij duikt erin en ik beslis of het een EpicSpot wordt.</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="suggest-name" className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1">
                      Restaurant naam
                    </label>
                    <input
                      id="suggest-name"
                      type="text"
                      value={suggestName}
                      onChange={(e) => setSuggestName(e.target.value)}
                      placeholder="bijv. Gao's Dim Sum Paleis"
                      required
                      maxLength={120}
                      disabled={suggestState === 'loading'}
                      className="w-full text-base px-4 py-3 rounded-xl border-2 border-inkBlack bg-white focus:outline-none focus:shadow-brutal-sm disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label htmlFor="suggest-city" className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1">
                      Stad
                    </label>
                    <select
                      id="suggest-city"
                      value={suggestCity}
                      onChange={(e) => setSuggestCity(e.target.value)}
                      required
                      disabled={suggestState === 'loading'}
                      className="w-full text-base px-4 py-3 rounded-xl border-2 border-inkBlack bg-white focus:outline-none focus:shadow-brutal-sm disabled:opacity-60"
                    >
                      <option value="" disabled>Kies een stad...</option>
                      {CITY_LIST.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="suggest-note" className="block text-xs font-black uppercase tracking-wide text-inkBlack/60 mb-1">
                      Waarom is deze plek goed? <span className="text-inkBlack/40 normal-case font-medium">(optioneel)</span>
                    </label>
                    <textarea
                      id="suggest-note"
                      value={suggestNote}
                      onChange={(e) => setSuggestNote(e.target.value)}
                      maxLength={200}
                      rows={3}
                      disabled={suggestState === 'loading'}
                      className="w-full text-base px-4 py-3 rounded-xl border-2 border-inkBlack bg-white focus:outline-none focus:shadow-brutal-sm disabled:opacity-60 resize-none"
                    />
                    {suggestNote.length > 0 && (
                      <p className="text-xs text-inkBlack/40 mt-1 text-right">
                        {suggestNote.length}/200
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSuggest}
                    disabled={
                      suggestState === 'loading' ||
                      !suggestName.trim() ||
                      !suggestCity.trim()
                    }
                    style={{ minHeight: 48 }}
                    className="w-full text-sm font-black px-4 py-3 rounded-full bg-epicGreen text-cream border-2 border-inkBlack shadow-brutal-sm disabled:opacity-50 transition-colors"
                  >
                    {suggestState === 'loading' ? 'Gao zoekt...' : 'Voeg toe →'}
                  </button>
                  {suggestState === 'error' && (
                    <p className="text-xs font-medium text-epicRed text-center">
                      Iets ging mis. Probeer het zo nog eens.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Gao sticker banner */}
          <div className="mt-4 p-4 rounded-2xl border-[3px] border-inkBlack shadow-brutal bg-[#fff3d6] flex items-center justify-between gap-4">
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
        </>
      ) : (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <Image
            src="/mascots/chopsticks.png"
            alt="Gao is aan het speuren"
            width={56}
            height={56}
            className="object-contain opacity-60"
          />
          <p className="font-black text-inkBlack/50">
            Gao is hier nog aan het speuren
          </p>
          <p className="text-xs text-inkBlack/30 max-w-xs mx-auto leading-relaxed">
            Hij weet zeker dat er dim sum parels verstopt zitten.
          </p>
          <Link href="/reis" className="text-xs font-black text-epicGreen border border-epicGreen/30 px-3 py-1.5 rounded-full mt-1">
            Ken jij een parel? →
          </Link>
        </div>
      )}

      {/* bottom padding so last card isn't hidden behind floating button */}
      <div className="h-20" />
    </div>

    {/* floating suggest FAB — centered on mobile, bottom-right on desktop */}
    {showSuggestFAB && filtered.length > 0 && (
      <button
        onClick={() => document.getElementById('suggest-form')?.scrollIntoView({ behavior: 'smooth' })}
        className="fixed bottom-[80px] left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0 z-40 bg-epicGreen text-cream font-black text-[14px] min-w-[200px] px-5 py-3 rounded-full border-2 border-inkBlack"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        🥟 Ken jij een goede plek?
      </button>
    )}
    </>
  )
}
