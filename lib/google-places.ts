export interface PlacesData {
  rating: number
  userRatingCount: number
  reviews: { text: { text: string }; rating: number }[]
  currentOpeningHours?: {
    openNow?: boolean
  }
  photoReference: string | null
  photoReferences: string[]
}

export function getPlacePhotoUrl(photoReference: string, maxWidth = 800): string {
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
}

export async function fetchGooglePlacesData(placeId: string): Promise<PlacesData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const fieldMask = [
    'displayName',
    'rating',
    'userRatingCount',
    'reviews',
    'currentOpeningHours',
    'photos',
  ].join(',')

  const url = `https://places.googleapis.com/v1/places/${placeId}`

  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    // No caching — this is only called from the sync route
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Places API error ${res.status}: ${body}`)
  }

  const data = await res.json()

  const photoReferences: string[] = data.photos?.slice(0, 3).map((p: { name: string }) => p.name) ?? []

  return {
    rating: data.rating ?? 0,
    userRatingCount: data.userRatingCount ?? 0,
    reviews: (data.reviews ?? []).slice(0, 5),
    currentOpeningHours: data.currentOpeningHours,
    photoReference: photoReferences[0] ?? null,
    photoReferences,
  }
}

export async function searchGooglePlaceByText(
  query: string
): Promise<{ placeId: string; name: string; address: string } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Places API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const place = data.places?.[0]
  if (!place) return null

  return {
    placeId: place.id,
    name: place.displayName?.text ?? query,
    address: place.formattedAddress ?? '',
  }
}

export function normalizeGoogleScore(rating: number, reviewCount: number): number {
  // rating is 0-5, normalize to 0-100
  // Apply a slight boost for high review counts (social proof)
  const ratingScore = (rating / 5) * 100
  const countBoost = Math.min(reviewCount / 2000, 1) * 10 // up to +10 for 2000+ reviews
  return Math.min(Math.round(ratingScore + countBoost), 100)
}
