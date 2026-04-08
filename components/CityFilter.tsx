'use client'

import { City } from '@/lib/types'

const cities: (City | 'Alle')[] = ['Alle', 'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven']

interface CityFilterProps {
  selected: City | 'Alle'
  onChange: (city: City | 'Alle') => void
}

export default function CityFilter({ selected, onChange }: CityFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {cities.map((city) => {
        const isActive = selected === city
        return (
          <button
            key={city}
            onClick={() => onChange(city)}
            className={`
              px-4 py-1.5 rounded-full border-2 border-inkBlack font-black text-sm
              shadow-brutal-sm transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
              ${isActive
                ? 'bg-inkBlack text-cream'
                : 'bg-cream text-inkBlack hover:bg-epicRed/10'
              }
            `}
          >
            {city}
          </button>
        )
      })}
    </div>
  )
}
