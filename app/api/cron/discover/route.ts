import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { upsertRestaurant } from '@/lib/db'
import { discoverNewSpots } from '@/lib/discovery'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { fetchTripadvisorData } from '@/lib/tripadvisor-scraper'
import { searchWebMentions } from '@/lib/web-search'
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
  const syncSecret = process.env.SYNC_SECRET
  const auth = request.headers.get('authorization')
  const syncHeader = request.headers.get('x-sync-secret')

  const validCron = cronSecret && auth === `Bearer ${cronSecret}`
  const validSync = syncSecret && (syncHeader === syncSecret || auth === `Bearer ${syncSecret}`)

  if (!validCron && !validSync) {
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
      const googleReviews = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

      let iensReviews: string[] = []
      let iensReviewCount = 0
      try {
        const iensData = await fetchIensData(spot.name, spot.city)
        iensReviews = iensData.reviewTexts
        iensReviewCount = iensData.reviewCount ?? 0
      } catch { /* non-fatal */ }

      let tripadvisorReviews: string[] = []
      try {
        const ta = await fetchTripadvisorData(spot.name, spot.city)
        tripadvisorReviews = ta.reviewTexts
      } catch { /* non-fatal */ }

      let webMentions: string[] = []
      try {
        const web = await searchWebMentions(spot.name, spot.city)
        webMentions = web.mentions
      } catch { /* non-fatal */ }

      const buzz = await computeBuzzScore(
        spot.name,
        spot.city,
        iensReviewCount,
        googleData.userRatingCount
      )
      const scores = await computeScoresWithClaude({
        name: spot.name,
        city: spot.city,
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        googleReviews,
        iensReviews,
        tripadvisorReviews,
        webMentions,
        buzzScore: buzz.totalBuzzScore,
      })

      const epicScore = scores.epicScore > 0
        ? scores.epicScore
        : Math.round((googleData.rating / 5) * 70)

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
        epicScore,
        haGaoDetail: scores.haGaoDetail,
        rankReason: scores.rankReason,
        haGaoIndex: scores.haGaoIndex,
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
        status: 'open',
        // Curator model: discoveries land in the inbox, never published automatically.
        verified: false,
        source: 'engine',
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
