export interface PlacesData {
  rating: number
  userRatingCount: number
  reviews: { text: { text: string }; rating: number }[]
  currentOpeningHours?: {
    openNow?: boolean
  }
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

  return {
    rating: data.rating ?? 0,
    userRatingCount: data.userRatingCount ?? 0,
    reviews: (data.reviews ?? []).slice(0, 5),
    currentOpeningHours: data.currentOpeningHours,
  }
}

export function normalizeGoogleScore(rating: number, reviewCount: number): number {
  // rating is 0-5, normalize to 0-100
  // Apply a slight boost for high review counts (social proof)
  const ratingScore = (rating / 5) * 100
  const countBoost = Math.min(reviewCount / 2000, 1) * 10 // up to +10 for 2000+ reviews
  return Math.min(Math.round(ratingScore + countBoost), 100)
}
