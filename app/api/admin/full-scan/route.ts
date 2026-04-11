import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { getAllRestaurants, upsertRestaurant } from '@/lib/db'
import { discoverNewSpots } from '@/lib/discovery'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { fetchTripadvisorData } from '@/lib/tripadvisor-scraper'
import { searchWebMentions } from '@/lib/web-search'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

export const runtime = 'nodejs'
export const maxDuration = 300

function slugify(name: string, city: string): string {
  return `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  try {
    const syncSecret = process.env.SYNC_SECRET
    const authHeader = request.headers.get('x-sync-secret')
    if (!syncSecret || authHeader !== syncSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cityFilter = searchParams.get('city') ?? undefined

    const newSpots = await discoverNewSpots(cityFilter)

    const existing = await getAllRestaurants()
    const existingSlugs = new Set(existing.map((r) => r.id))

    let added = 0
    let skipped = 0
    const addedNames: string[] = []

    for (const spot of newSpots) {
      const id = slugify(spot.name, spot.city)
      if (existingSlugs.has(id)) {
        skipped++
        continue
      }

      try {
        let googleData = {
          rating: spot.googleRating,
          userRatingCount: spot.googleReviewCount,
          reviews: [] as { text: { text: string }; rating: number }[],
        }
        try {
          googleData = await fetchGooglePlacesData(spot.googlePlaceId)
        } catch { /* use basic data */ }

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
          : Math.max(
              Math.round(
                (googleData.rating / 5) * 60 +
                Math.min(Math.log10(googleData.userRatingCount + 1) / 3 * 20, 20)
              ),
              30
            )

        const restaurant: Restaurant = {
          id,
          name: spot.name,
          city: spot.city as City,
          address: spot.address,
          googlePlaceId: spot.googlePlaceId,
          cuisine: 'Dim Sum',
          priceRange: '€€' as PriceRange,
          coords: spot.coords,
          mustOrder: scores.mustOrder,
          epicScore,
          haGaoIndex: scores.haGaoIndex,
          haGaoDetail: scores.haGaoDetail,
          rankReason: scores.rankReason,
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
          verified: false,
          sources: {
            googleRating: googleData.rating,
            googleReviewCount: googleData.userRatingCount,
            blogMentions: buzz.blogMentions + buzz.tiktokMentions,
            lastUpdated: new Date().toISOString(),
          },
        }

        await upsertRestaurant(restaurant)
        existingSlugs.add(id)
        added++
        addedNames.push(spot.name)
      } catch (err) {
        console.error(`Full-scan: failed to add ${spot.name}:`, err)
        skipped++
      }

      await sleep(800)
    }

    return NextResponse.json({
      found: newSpots.length,
      added,
      skipped,
      restaurants: addedNames,
    })
  } catch (err) {
    console.error('Full-scan error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
