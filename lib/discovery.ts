import { getAllRestaurants } from './db'

export interface NewSpot {
  googlePlaceId: string
  name: string
  city: string
  address: string
  coords: { lat: number; lng: number }
  googleRating: number
  googleReviewCount: number
}

const DISCOVERY_CITIES = [
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam', lat: 51.9225, lng: 4.4792 },
  { name: 'Den Haag', lat: 52.0705, lng: 4.3007 },
  { name: 'Utrecht', lat: 52.0907, lng: 5.1214 },
  { name: 'Eindhoven', lat: 51.4416, lng: 5.4697 },
]

const DIM_SUM_KEYWORDS = ['dim sum', 'dimsum', 'yum cha', 'kantonees', 'cantonese', 'ha gao', 'har gow', 'siu mai']

// Machine-readable primary types considered valid for dim sum spots
const VALID_PRIMARY_TYPES = new Set([
  'chinese_restaurant',
  'dim_sum_restaurant',
  'asian_restaurant',
  'cantonese_restaurant',
  'restaurant',
])

export const BLOCKLIST_KEYWORDS = [
  'reisbureau', 'travel', 'reizen', 'hotel', 'hostel',
  'supermarkt', 'supermarket', 'toko', 'shop', 'store',
  'winkel', 'markt', 'market', 'school', 'academy',
]

export function isActualRestaurant(spot: Pick<NewSpot, 'name' | 'googleReviewCount'>): boolean {
  const nameLower = spot.name.toLowerCase()
  if (BLOCKLIST_KEYWORDS.some((kw) => nameLower.includes(kw))) return false
  if (spot.googleReviewCount < 10) return false
  return true
}

interface PlacesNearbyResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  primaryType?: string
  primaryTypeDisplayName?: { text: string }
}

interface PlacesTextResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
}

async function searchNearby(city: { name: string; lat: number; lng: number }): Promise<NewSpot[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const requestBody = {
    includedTypes: ['restaurant', 'chinese_restaurant'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 8000.0,
      },
    },
    rankPreference: 'POPULARITY',
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`[Discovery Nearby] ${city.name}: API error ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json()
  const places: PlacesNearbyResult[] = data.places ?? []

  console.log(`[Discovery Nearby] ${city.name}: ${places.length} raw results`)

  const filtered = places.filter((p) => {
    const name = p.displayName?.text?.toLowerCase() ?? ''
    const type = p.primaryTypeDisplayName?.text?.toLowerCase() ?? ''
    const primaryType = p.primaryType ?? ''
    const rating = p.rating ?? 0
    const reviewCount = p.userRatingCount ?? 0

    if (reviewCount < 20) return false

    const nameHasDimSum = DIM_SUM_KEYWORDS.some((kw) => name.includes(kw))
    if (nameHasDimSum) return true

    // Require a valid primary type (skip non-restaurant businesses)
    if (!VALID_PRIMARY_TYPES.has(primaryType) && !type.includes('dim sum') && !type.includes('chinese')) return false

    if (type.includes('dim sum') || type.includes('chinese')) return true
    if (rating >= 4.0 && (name.includes('china') || name.includes('chinese') || name.includes('asian') || name.includes('canton'))) return true

    return false
  })

  console.log(`[Discovery Nearby] ${city.name}: ${places.length} raw → ${filtered.length} after filter`)

  return filtered.map((p) => ({
    googlePlaceId: p.id,
    name: p.displayName?.text ?? 'Onbekend',
    city: city.name,
    address: p.formattedAddress ?? '',
    coords: {
      lat: p.location?.latitude ?? city.lat,
      lng: p.location?.longitude ?? city.lng,
    },
    googleRating: p.rating ?? 0,
    googleReviewCount: p.userRatingCount ?? 0,
  }))
}

async function searchByText(
  city: { name: string; lat: number; lng: number },
  query?: string
): Promise<NewSpot[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const textQuery = query ?? `dim sum ${city.name} Nederland`

  const body = {
    textQuery,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 10000.0,
      },
    },
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`[Discovery TextSearch] "${textQuery}": API error ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json()
  console.log(`[Discovery TextSearch] "${textQuery}":`, JSON.stringify(data).slice(0, 300))

  const places: PlacesTextResult[] = data.places ?? []

  const filtered = places.filter((p) => {
    const name = p.displayName?.text?.toLowerCase() ?? ''
    const rating = p.rating ?? 0
    const reviewCount = p.userRatingCount ?? 0

    if (reviewCount < 20) return false
    if (DIM_SUM_KEYWORDS.some((kw) => name.includes(kw))) return true
    if (rating >= 4.0 && (name.includes('china') || name.includes('chinese') || name.includes('asian') || name.includes('canton'))) return true
    if (rating >= 4.2) return true

    return false
  })

  console.log(`[Discovery TextSearch] "${textQuery}": ${places.length} raw → ${filtered.length} after filter`)

  return filtered.map((p) => ({
    googlePlaceId: p.id,
    name: p.displayName?.text ?? 'Onbekend',
    city: city.name,
    address: p.formattedAddress ?? '',
    coords: {
      lat: p.location?.latitude ?? city.lat,
      lng: p.location?.longitude ?? city.lng,
    },
    googleRating: p.rating ?? 0,
    googleReviewCount: p.userRatingCount ?? 0,
  }))
}

function getCityQueries(city: { name: string }): string[] {
  const base = [
    `dim sum ${city.name}`,
    `yum cha ${city.name}`,
    `Chinees restaurant ${city.name} dim sum`,
    `Kantonees restaurant ${city.name}`,
    `蒸饺 ${city.name}`,
  ]

  if (city.name === 'Den Haag') {
    base.push('dim sum Wagenstraat Den Haag')
    base.push('Chinees Wagenstraat Den Haag')
    base.push('dim sum Chinatown Den Haag')
  }

  if (city.name === 'Rotterdam') {
    base.push('dim sum Rotterdam Centrum')
    base.push('Chinees restaurant Rotterdam West Kruiskade')
    base.push('dim sum West-Kruiskade')
  }

  return base
}

async function searchAllQueriesForCity(city: { name: string; lat: number; lng: number }): Promise<NewSpot[]> {
  const queries = getCityQueries(city)

  const results = await Promise.allSettled(
    queries.map((q) => searchByText(city, q))
  )

  const allSpots: NewSpot[] = []
  const seen = new Set<string>()

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const spot of result.value) {
        if (!seen.has(spot.googlePlaceId)) {
          seen.add(spot.googlePlaceId)
          allSpots.push(spot)
        }
      }
    }
  }

  return allSpots
}

async function searchCity(city: { name: string; lat: number; lng: number }): Promise<NewSpot[]> {
  const [nearbyResults, textResults] = await Promise.allSettled([
    searchNearby(city),
    searchAllQueriesForCity(city),
  ])

  const allResults = [
    ...(nearbyResults.status === 'fulfilled' ? nearbyResults.value : []),
    ...(textResults.status === 'fulfilled' ? textResults.value : []),
  ]

  const seen = new Set<string>()
  return allResults.filter((r) => {
    if (seen.has(r.googlePlaceId)) return false
    seen.add(r.googlePlaceId)
    return true
  })
}

export async function discoverNewSpots(cityFilter?: string): Promise<NewSpot[]> {
  const existing = await getAllRestaurants()
  const existingPlaceIds = new Set(existing.map((r) => r.googlePlaceId))

  const citiesToScan = cityFilter
    ? DISCOVERY_CITIES.filter((c) => c.name === cityFilter)
    : DISCOVERY_CITIES

  const results = await Promise.all(citiesToScan.map(searchCity))
  const allSpots = results.flat()

  const newSpots = allSpots
    .filter((spot) => !existingPlaceIds.has(spot.googlePlaceId))
    .filter(isActualRestaurant)

  const seen = new Set<string>()
  return newSpots.filter((spot) => {
    if (seen.has(spot.googlePlaceId)) return false
    seen.add(spot.googlePlaceId)
    return true
  })
}
