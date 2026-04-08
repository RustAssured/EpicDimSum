import { NextRequest, NextResponse } from 'next/server'
import { Restaurant } from '@/lib/types'
import { getRestaurantById, upsertRestaurant } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

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

    let googleData = {
      rating: restaurant.sources.googleRating,
      userRatingCount: restaurant.sources.googleReviewCount,
      reviews: [] as { text: { text: string }; rating: number }[],
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

    const [buzz, scores] = await Promise.all([
      computeBuzzScore(restaurant.name, restaurant.city, iensReviewCount),
      computeScoresWithClaude({
        name: restaurant.name,
        city: restaurant.city,
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        googleReviews: reviewTexts,
        iensText,
      }),
    ])

    const updated: Restaurant = {
      ...restaurant,
      haGaoIndex: scores.haGaoIndex,
      haGaoDetail: scores.haGaoDetail,
      rankReason: scores.rankReason,
      mustOrder: scores.mustOrder,
      epicScore: scores.epicScore,
      summary: scores.summary,
      reviewSnippets: reviewTexts.slice(0, 3),
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
