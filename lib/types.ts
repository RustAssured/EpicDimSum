export type City =
  | 'Amsterdam'
  | 'Rotterdam'
  | 'Den Haag'
  | 'Utrecht'
  | 'Eindhoven'
  | 'Groningen'
  | 'Leeuwarden'
  | 'Assen'
  | 'Zwolle'
  | 'Arnhem'
  | 'Maastricht'
  | 'Middelburg'
  | 'Lelystad'
  | "'s-Hertogenbosch"

// Canonical list of cities — used by the dropdown in the suggest form.
// Keep in sync with the City union and CITY_MAP in lib/db.ts.
export const CITY_LIST: City[] = [
  'Amsterdam',
  'Rotterdam',
  'Den Haag',
  'Utrecht',
  'Eindhoven',
  'Groningen',
  'Leeuwarden',
  'Assen',
  'Zwolle',
  'Arnhem',
  'Maastricht',
  'Middelburg',
  'Lelystad',
  "'s-Hertogenbosch",
]

export type PriceRange = '€' | '€€' | '€€€'
export type Status = 'open' | 'busy' | 'closed' | 'pending' | 'suggested'

export interface Restaurant {
  id: string
  name: string
  city: City
  address: string
  googlePlaceId: string
  cuisine: string
  priceRange: PriceRange
  coords: {
    lat: number
    lng: number
  }
  mustOrder: string
  epicScore: number
  haGaoIndex: number
  haGaoDetail?: string
  rankReason?: string
  dumplingMentionScore?: number
  dumplingQualityScore?: number | null
  dumplingScore?: number
  confidence?: number
  scores: {
    google: number
    haGao: number
    buzz: number
    vibe: number
  }
  status: Status
  verified?: boolean
  agentReason?: string
  photoReference?: string | null
  photoReferences?: string[]
  reservationUrl?: string
  summary?: string
  reviewSnippets?: string[]
  source?: 'engine' | 'user' | 'seed'
  note?: string
  submittedBy?: string
  communityCheckins?: number
  sources: {
    googleRating: number
    googleReviewCount: number
    blogMentions: number
    lastUpdated: string
  }
}

export interface SyncResult {
  haGaoIndex: number
  mustOrder: string
  vibeScore: number
  buzzScore: number
  epicScore: number
  summary: string
  haGaoDetail: string
  rankReason: string
  dumplingMentionScore?: number
  dumplingQualityScore?: number | null
  dumplingScore?: number
  confidence?: number
}
