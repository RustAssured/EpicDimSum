import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, upsertRestaurant } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'
import { Restaurant } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const restaurants = await getAllRestaurants()
  let synced = 0
  let failed = 0

  for (const restaurant of restaurants) {
    try {
      let googleData = {
        rating: restaurant.sources.googleRating,
        userRatingCount: restaurant.sources.googleReviewCount,
        reviews: [] as { text: { text: string }; rating: number }[],
      }
      try {
        googleData = await fetchGooglePlacesData(restaurant.googlePlaceId)
      } catch (err) {
        console.error(`Google Places failed for ${restaurant.id}:`, err)
      }

      const googleScore = normalizeGoogleScore(googleData.rating, googleData.userRatingCount)
      const reviewTexts = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

      let iensText = ''
      let iensReviewCount = restaurant.sources.blogMentions
      try {
        const iensData = await fetchIensData(restaurant.name, restaurant.city)
        iensText = iensData.rawText.slice(0, 1500)
        iensReviewCount = iensData.reviewCount ?? iensReviewCount
      } catch { /* non-fatal */ }

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
      synced++
    } catch (err) {
      console.error(`Sync failed for ${restaurant.id}:`, err)
      failed++
    }

    // 500ms delay between restaurants to avoid rate limits
    await sleep(500)
  }

  return NextResponse.json({ total: restaurants.length, synced, failed })
}
