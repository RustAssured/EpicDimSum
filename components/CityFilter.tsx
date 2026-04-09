'use client'

import { City } from '@/lib/types'

const cities: (City | 'Alle')[] = ['Alle', 'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven']

interface CityFilterProps {
  selected: City | 'Alle'
  onChange: (city: City | 'Alle') => void
}

export default function CityFilter({ selected, onChange }: CityFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto -mx-4 px-4"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {cities.map((city) => {
        const isActive = selected === city
        return (
          <button
            key={city}
            onClick={() => onChange(city)}
            className={`
              shrink-0 px-4 py-1.5 rounded-full border-2 border-inkBlack font-black text-sm
              shadow-brutal-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              ${isActive
                ? 'bg-inkBlack text-cream'
                : 'bg-cream text-inkBlack'
              }
            `}
          >
            {city}
          </button>
        )
      })}
      {/* trailing space so last pill isn't flush to edge */}
      <span className="shrink-0 w-2" aria-hidden="true" />
    </div>
  )
}
