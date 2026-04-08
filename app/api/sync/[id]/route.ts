import { NextRequest, NextResponse } from 'next/server'
import { Restaurant } from '@/lib/types'
import { getRestaurantById, upsertRestaurant } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { fetchTripadvisorData } from '@/lib/tripadvisor-scraper'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

const USE_TRIPADVISOR = process.env.ENABLE_TRIPADVISOR === 'true'

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

    // Fix 4: When epicScore is 0, don't seed with stale cached zeros — rely on fresh API data
    const forceRefresh = restaurant.epicScore === 0
    let googleData = {
      rating: forceRefresh ? 0 : restaurant.sources.googleRating,
      userRatingCount: forceRefresh ? 0 : restaurant.sources.googleReviewCount,
      reviews: [] as { text: { text: string }; rating: number }[],
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
    const reviewTexts = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

    let iensText = ''
    let iensReviewCount = restaurant.sources.blogMentions
    try {
      const iensData = await fetchIensData(restaurant.name, restaurant.city)
      iensText = iensData.rawText.slice(0, 1500)
      iensReviewCount = iensData.reviewCount ?? iensReviewCount
    } catch (err) {
      console.error(`Iens fetch failed:`, err)
    }

    let tripadvisorText = ''
    if (USE_TRIPADVISOR) {
      try {
        const ta = await fetchTripadvisorData(restaurant.name, restaurant.city)
        tripadvisorText = ta.rawText.slice(0, 1000)
      } catch { /* silent fail */ }
    }

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
      googleReviews: reviewTexts,
      iensText,
      tripadvisorText,
      buzzScore: buzz.totalBuzzScore,
    })

    const epicScore = (!scores.epicScore || scores.epicScore === 0)
      ? epicScoreFallback(googleData.rating, googleData.userRatingCount)
      : scores.epicScore

    // Fix 2: Auto-verify when score data is meaningful
    const verified = epicScore > 20 && scores.haGaoIndex > 0

    const updated: Restaurant = {
      ...restaurant,
      verified,
      haGaoIndex: scores.haGaoIndex,
      haGaoDetail: scores.haGaoDetail,
      rankReason: scores.rankReason,
      mustOrder: scores.mustOrder,
      epicScore,
      summary: scores.summary,
      reviewSnippets: reviewTexts.slice(0, 3),
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
