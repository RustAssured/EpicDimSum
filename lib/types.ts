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
export type PriceRange = '€' | '€€' | '€€€'
export type Status = 'open' | 'busy' | 'closed' | 'pending'

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
  reservationUrl?: string
  summary?: string
  reviewSnippets?: string[]
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
