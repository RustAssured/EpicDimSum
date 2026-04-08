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

interface PlacesTextResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
}

async function searchByText(city: { name: string; lat: number; lng: number }): Promise<NewSpot[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const body = {
    textQuery: `dim sum ${city.name} Nederland`,
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
    console.error(`[Discovery TextSearch] ${city.name}: API error ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json()
  console.log(`[Discovery TextSearch] ${city.name}:`, JSON.stringify(data).slice(0, 500))

  const places: PlacesTextResult[] = data.places ?? []

  const filtered = places.filter((p) => {
    const name = p.displayName?.text?.toLowerCase() ?? ''
    const rating = p.rating ?? 0
    const reviewCount = p.userRatingCount ?? 0

    // Must have sufficient reviews
    if (reviewCount < 20) return false

    // Accept if name contains any dim sum keyword
    if (DIM_SUM_KEYWORDS.some((kw) => name.includes(kw))) return true

    // Accept well-rated Chinese restaurants
    if (rating >= 4.0 && (name.includes('china') || name.includes('chinese') || name.includes('asian') || name.includes('canton'))) return true

    // Accept all results from text search (query is already specific)
    if (rating >= 4.2) return true

    return false
  })

  console.log(`[Discovery TextSearch] ${city.name}: ${places.length} raw → ${filtered.length} after filter`)

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

export async function discoverNewSpots(): Promise<NewSpot[]> {
  const existing = await getAllRestaurants()
  const existingPlaceIds = new Set(existing.map((r) => r.googlePlaceId))

  const results = await Promise.all(DISCOVERY_CITIES.map(searchByText))
  const allSpots = results.flat()

  const newSpots = allSpots.filter((spot) => !existingPlaceIds.has(spot.googlePlaceId))

  const seen = new Set<string>()
  return newSpots.filter((spot) => {
    if (seen.has(spot.googlePlaceId)) return false
    seen.add(spot.googlePlaceId)
    return true
  })
}
