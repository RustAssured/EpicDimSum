'use client'

import { useState, useMemo } from 'react'
import { Restaurant, City } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import CityFilter from '@/components/CityFilter'
import HiddenGemAlert from '@/components/HiddenGemAlert'

interface RestaurantFeedProps {
  restaurants: Restaurant[]
}

function findHiddenGem(list: Restaurant[]): Restaurant {
  return list.reduce(
    (best, r) => (r.sources.blogMentions > best.sources.blogMentions ? r : best),
    list[0]
  )
}

export default function RestaurantFeed({ restaurants }: RestaurantFeedProps) {
  const [selectedCity, setSelectedCity] = useState<City | 'Alle'>('Alle')
  const [searchQuery, setSearchQuery] = useState('')

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
          r.cuisine.toLowerCase().includes(q) ||
          r.mustOrder.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.epicScore - a.epicScore)
  }, [restaurants, selectedCity, searchQuery])

  const hiddenGem = useMemo(() => (restaurants.length > 0 ? findHiddenGem(restaurants) : null), [restaurants])

  return (
    <div className="space-y-5">
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

      {/* Hidden gem alert */}
      {hiddenGem && <HiddenGemAlert restaurant={hiddenGem} />}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-inkBlack/50">
          {filtered.length} {filtered.length === 1 ? 'restaurant' : 'restaurants'}
          {selectedCity !== 'Alle' && ` in ${selectedCity}`}
        </p>
        <p className="text-xs text-inkBlack/30">Gesorteerd op EpicScore</p>
      </div>

      {/* Restaurant cards */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🥟</p>
          <p className="font-black text-inkBlack/50">Geen restaurants gevonden</p>
          <p className="text-sm text-inkBlack/30 mt-1">Probeer een andere zoekopdracht</p>
        </div>
      )}
    </div>
  )
}
