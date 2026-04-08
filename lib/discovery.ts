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

interface PlacesNearbyResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  primaryTypeDisplayName?: { text: string }
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
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryTypeDisplayName',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`[Discovery] ${city.name}: API error ${res.status} ${await res.text()}`)
    return []
  }

  const data = await res.json()
  const places: PlacesNearbyResult[] = data.places ?? []

  console.log(`[Discovery] ${city.name}: API returned ${places.length} raw results`)
  if (places.length > 0) {
    console.log(`[Discovery] ${city.name}: Sample result:`, JSON.stringify(places[0], null, 2))
  }

  const filtered = places.filter((p) => {
    const name = p.displayName?.text?.toLowerCase() ?? ''
    const type = p.primaryTypeDisplayName?.text?.toLowerCase() ?? ''
    const rating = p.rating ?? 0

    // Accept if ANY of these are true:
    if (name.includes('dim sum')) return true
    if (type.includes('dim sum') || type.includes('chinese')) return true
    if (rating >= 4.0 && (name.includes('china') || name.includes('chinese') || name.includes('asian') || type.includes('asian'))) return true

    return false
  })

  console.log(`[Discovery] ${city.name}: After filter: ${filtered.length} spots`)

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

  const results = await Promise.all(DISCOVERY_CITIES.map(searchNearby))
  const allSpots = results.flat()

  const newSpots = allSpots.filter((spot) => !existingPlaceIds.has(spot.googlePlaceId))

  const seen = new Set<string>()
  return newSpots.filter((spot) => {
    if (seen.has(spot.googlePlaceId)) return false
    seen.add(spot.googlePlaceId)
    return true
  })
}
