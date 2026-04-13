'use client'

import { useState } from 'react'
import { City } from '@/lib/types'

const PRIMARY_CITIES: (City | 'Alle')[] = [
  'Alle', 'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht'
]

const MORE_CITIES: City[] = [
  'Arnhem', 'Eindhoven', 'Groningen', 'Leeuwarden',
  'Lelystad', 'Maastricht', 'Middelburg', 'Assen',
  'Zwolle', "'s-Hertogenbosch"
]

interface CityFilterProps {
  selected: City | 'Alle'
  onChange: (city: City | 'Alle') => void
  availableCities?: City[]
}

export default function CityFilter({ selected, onChange, availableCities }: CityFilterProps) {
  const [showMore, setShowMore] = useState(false)

  const isMoreSelected = MORE_CITIES.includes(selected as City)

  const pillClass = (city: City | 'Alle') => {
    const isActive = selected === city
    return `px-3 py-1.5 rounded-full border-2 border-inkBlack font-black text-xs transition-all active:scale-95 whitespace-nowrap ${
      isActive
        ? 'bg-inkBlack text-cream'
        : 'bg-cream text-inkBlack hover:bg-epicRed/10'
    }`
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Primary city pills */}
        {PRIMARY_CITIES.map((city) => (
          <button
            key={city}
            onClick={() => {
              onChange(city)
              setShowMore(false)
            }}
            className={pillClass(city)}
          >
            {city}
          </button>
        ))}

        {/* Meer steden dropdown trigger */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`px-3 py-1.5 rounded-full border-2 border-inkBlack font-black text-xs transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 ${
            isMoreSelected
              ? 'bg-inkBlack text-cream'
              : 'bg-cream text-inkBlack hover:bg-epicRed/10'
          }`}
        >
          {isMoreSelected ? selected : 'Meer steden'}
          <span className={`text-[10px] transition-transform ${showMore ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* Dropdown */}
      {showMore && (
        <div className="absolute top-full left-0 mt-2 z-30 bg-white border-[3px] border-inkBlack rounded-2xl shadow-brutal overflow-hidden min-w-[200px]">
          {MORE_CITIES.map((city) => {
            const hasRestaurants = !availableCities || availableCities.includes(city)
            return (
              <button
                key={city}
                onClick={() => {
                  if (hasRestaurants) {
                    onChange(city)
                    setShowMore(false)
                  }
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-black transition-colors border-b border-inkBlack/10 last:border-0 ${
                  selected === city
                    ? 'bg-inkBlack text-cream'
                    : hasRestaurants
                      ? 'hover:bg-epicRed/5 text-inkBlack'
                      : 'text-inkBlack/30 cursor-not-allowed'
                }`}
              >
                {city}
                {!hasRestaurants && (
                  <span className="text-[9px] font-medium ml-1">geen spots</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showMore && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowMore(false)}
        />
      )}
    </div>
  )
}
