import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City } from '@/lib/types'

export const maxDuration = 300
export const runtime = 'nodejs'
import { getRestaurantById, upsertRestaurant, normalizeCity, isKnownCity } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore, extractCityFromAddressComponents } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { fetchTripadvisorData } from '@/lib/tripadvisor-scraper'
import { searchWebMentions } from '@/lib/web-search'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

function epicScoreFallback(googleRating: number, reviewCount: number): number {
  return Math.max(
    Math.round(
      (googleRating / 5) * 60 +
      Math.min(Math.log10(reviewCount + 1) / 3 * 20, 20)
    ),
    30
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const syncSecret = process.env.SYNC_SECRET
    const authHeader = request.headers.get('x-sync-secret')
    if (!syncSecret || authHeader !== syncSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await getRestaurantById(params.id)
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const forceRefresh = restaurant.epicScore === 0
    let googleData: import('@/lib/google-places').PlacesData = {
      rating: forceRefresh ? 0 : restaurant.sources.googleRating,
      userRatingCount: forceRefresh ? 0 : restaurant.sources.googleReviewCount,
      reviews: [] as { text: { text: string }; rating: number }[],
      photoReference: restaurant.photoReference ?? null,
      photoReferences: restaurant.photoReferences ?? [],
    }
    if (forceRefresh) {
      console.log(`[Sync] Force refresh for zero-score restaurant: ${restaurant.name}`)
    }
    try {
      googleData = await fetchGooglePlacesData(restaurant.googlePlaceId)
    } catch (err) {
      console.error(`Google Places fetch failed:`, err)
    }

    const googleScore = normalizeGoogleScore(googleData.rating, googleData.userRatingCount)
    const googleReviews = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

    let iensReviews: string[] = []
    let iensReviewCount = restaurant.sources.blogMentions
    try {
      const iensData = await fetchIensData(restaurant.name, restaurant.city)
      iensReviews = iensData.reviewTexts
      iensReviewCount = iensData.reviewCount ?? iensReviewCount
    } catch (err) {
      console.error(`Iens fetch failed:`, err)
    }

    let tripadvisorReviews: string[] = []
    try {
      const ta = await fetchTripadvisorData(restaurant.name, restaurant.city)
      tripadvisorReviews = ta.reviewTexts
    } catch { /* silent fail */ }

    let webMentions: string[] = []
    try {
      const web = await searchWebMentions(restaurant.name, restaurant.city)
      webMentions = web.mentions
    } catch { /* silent fail */ }

    // Compute buzz first so we can pass it to Claude for a consistent epicScore formula
    const buzz = await computeBuzzScore(
      restaurant.name,
      restaurant.city,
      iensReviewCount,
      googleData.userRatingCount
    )

    const scores = await computeScoresWithClaude({
      name: restaurant.name,
      city: restaurant.city,
      googleRating: googleData.rating,
      googleReviewCount: googleData.userRatingCount,
      googleReviews,
      iensReviews,
      tripadvisorReviews,
      webMentions,
      buzzScore: buzz.totalBuzzScore,
    })

    const epicScore = (!scores.epicScore || scores.epicScore === 0)
      ? epicScoreFallback(googleData.rating, googleData.userRatingCount)
      : scores.epicScore

    // verified is owned by the admin (curator model). Sync only updates scores;
    // it never publishes or unpublishes a restaurant.
    const verified = restaurant.verified ?? false

    // Detect city correction from Google Places addressComponents
    let cityCorrection: { city: City } | Record<string, never> = {}
    const locality = extractCityFromAddressComponents(googleData.addressComponents)
    if (locality) {
      const newCity: City = isKnownCity(locality) ? normalizeCity(locality) : (locality as City)
      if (newCity && newCity !== restaurant.city) {
        console.log(`[Sync] City corrected: ${restaurant.city} → ${newCity} for ${restaurant.name}`)
        cityCorrection = { city: newCity }
      }
    }

    const updated: Restaurant = {
      ...restaurant,
      ...cityCorrection,
      verified,
      photoReference: googleData.photoReference,
      photoReferences: googleData.photoReferences,
      haGaoIndex: scores.haGaoIndex,
      haGaoDetail: scores.haGaoDetail,
      rankReason: scores.rankReason,
      mustOrder: scores.mustOrder,
      epicScore,
      summary: scores.summary,
      reviewSnippets: googleReviews.slice(0, 3),
      dumplingMentionScore: scores.dumplingMentionScore,
      dumplingQualityScore: scores.dumplingQualityScore,
      dumplingScore: scores.dumplingScore,
      confidence: scores.confidence,
      scores: {
        google: googleScore,
        haGao: Math.round((scores.haGaoIndex / 5) * 100),
        buzz: buzz.totalBuzzScore,
        vibe: scores.vibeScore,
      },
      sources: {
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        blogMentions: buzz.blogMentions + buzz.tiktokMentions,
        lastUpdated: new Date().toISOString(),
      },
    }

    await upsertRestaurant(updated)

    return NextResponse.json({ success: true, restaurant: updated })
  } catch (err) {
    console.error('Sync error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
