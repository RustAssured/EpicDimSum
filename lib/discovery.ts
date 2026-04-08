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
}

async function searchNearby(city: { name: string; lat: number; lng: number }): Promise<NewSpot[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const requestBody = {
    textQuery: `dim sum ${city.name}`,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 5000,
      },
    },
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`Places search failed for ${city.name}: ${res.status}`)
    return []
  }

  const data = await res.json()
  const places: PlacesNearbyResult[] = data.places ?? []

  return places.map((p) => ({
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
  // Get existing place IDs to deduplicate
  const existing = await getAllRestaurants()
  const existingPlaceIds = new Set(existing.map((r) => r.googlePlaceId))

  const results = await Promise.all(DISCOVERY_CITIES.map(searchNearby))
  const allSpots = results.flat()

  // Filter out already-known restaurants
  const newSpots = allSpots.filter(
    (spot) => !existingPlaceIds.has(spot.googlePlaceId)
  )

  // Deduplicate by placeId within results
  const seen = new Set<string>()
  return newSpots.filter((spot) => {
    if (seen.has(spot.googlePlaceId)) return false
    seen.add(spot.googlePlaceId)
    return true
  })
}
