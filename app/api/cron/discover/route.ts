import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { upsertRestaurant } from '@/lib/db'
import { discoverNewSpots } from '@/lib/discovery'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

export const runtime = 'nodejs'
export const maxDuration = 60

function slugify(name: string, city: string): string {
  return `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const newSpots = await discoverNewSpots()
  let added = 0
  const skipped = 0

  for (const spot of newSpots) {
    try {
      let googleData = {
        rating: spot.googleRating,
        userRatingCount: spot.googleReviewCount,
        reviews: [] as { text: { text: string }; rating: number }[],
      }
      try {
        googleData = await fetchGooglePlacesData(spot.googlePlaceId)
      } catch { /* use basic data from discovery */ }

      const googleScore = normalizeGoogleScore(googleData.rating, googleData.userRatingCount)
      const reviewTexts = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

      let iensText = ''
      let iensReviewCount = 0
      try {
        const iensData = await fetchIensData(spot.name, spot.city)
        iensText = iensData.rawText.slice(0, 1500)
        iensReviewCount = iensData.reviewCount ?? 0
      } catch { /* non-fatal */ }

      const [buzz, scores] = await Promise.all([
        computeBuzzScore(spot.name, spot.city, iensReviewCount),
        computeScoresWithClaude({
          name: spot.name,
          city: spot.city,
          googleRating: googleData.rating,
          googleReviewCount: googleData.userRatingCount,
          googleReviews: reviewTexts,
          iensText,
        }),
      ])

      const restaurant: Restaurant = {
        id: slugify(spot.name, spot.city),
        name: spot.name,
        city: spot.city as City,
        address: spot.address,
        googlePlaceId: spot.googlePlaceId,
        cuisine: 'Dim Sum',
        priceRange: '€€' as PriceRange,
        coords: spot.coords,
        mustOrder: scores.mustOrder,
        epicScore: scores.epicScore,
        haGaoIndex: scores.haGaoIndex,
        summary: scores.summary,
        reviewSnippets: reviewTexts.slice(0, 3),
        scores: {
          google: googleScore,
          haGao: Math.round((scores.haGaoIndex / 5) * 100),
          buzz: buzz.totalBuzzScore,
          vibe: scores.vibeScore,
        },
        status: 'open',
        sources: {
          googleRating: googleData.rating,
          googleReviewCount: googleData.userRatingCount,
          blogMentions: buzz.blogMentions + buzz.tiktokMentions,
          lastUpdated: new Date().toISOString(),
        },
      }

      await upsertRestaurant(restaurant)
      added++
    } catch (err) {
      console.error(`Failed to add spot ${spot.name}:`, err)
    }
  }

  return NextResponse.json({
    discovered: newSpots.length,
    added,
    skipped,
  })
}
