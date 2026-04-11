import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { upsertRestaurant, getAllRestaurants } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { fetchTripadvisorData } from '@/lib/tripadvisor-scraper'
import { searchWebMentions } from '@/lib/web-search'
import { computeScoresWithClaude } from '@/lib/score-engine'
import { computeBuzzScore } from '@/lib/buzz-engine'

function slugify(name: string, city: string): string {
  return [name, city]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function POST(request: NextRequest) {
  try {
    const syncSecret = process.env.SYNC_SECRET
    const authHeader = request.headers.get('x-sync-secret')
    if (!syncSecret || authHeader !== syncSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { placeId, name, city, priceRange } = body as {
      placeId: string
      name: string
      city: City
      priceRange: PriceRange
    }

    if (!placeId || !name || !city || !priceRange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const id = slugify(name, city)

    const existing = await getAllRestaurants()
    const duplicate = existing.find((r) => r.googlePlaceId === placeId || r.id === id)
    if (duplicate) {
      return NextResponse.json({ error: 'Restaurant bestaat al' }, { status: 409 })
    }

    // Step 1: Google Places data
    let googleData = {
      rating: 0,
      userRatingCount: 0,
      reviews: [] as { text: { text: string }; rating: number }[],
    }
    try {
      googleData = await fetchGooglePlacesData(placeId)
    } catch (err) {
      console.error('Google Places fetch failed:', err)
    }

    const googleScore = normalizeGoogleScore(googleData.rating, googleData.userRatingCount)
    const googleReviews = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

    // Step 2: Iens reviews
    let iensReviews: string[] = []
    let iensReviewCount = 0
    try {
      const iensData = await fetchIensData(name, city)
      iensReviews = iensData.reviewTexts
      iensReviewCount = iensData.reviewCount ?? 0
    } catch (err) {
      console.error('Iens fetch failed:', err)
    }

    // Step 3: Tripadvisor reviews
    let tripadvisorReviews: string[] = []
    try {
      const ta = await fetchTripadvisorData(name, city)
      tripadvisorReviews = ta.reviewTexts
    } catch { /* non-fatal */ }

    // Step 4: Web mentions
    let webMentions: string[] = []
    try {
      const web = await searchWebMentions(name, city)
      webMentions = web.mentions
    } catch { /* non-fatal */ }

    // Step 5: Buzz + Claude scores
    const [buzz, scores] = await Promise.all([
      computeBuzzScore(name, city, iensReviewCount),
      computeScoresWithClaude({
        name,
        city,
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        googleReviews,
        iensReviews,
        tripadvisorReviews,
        webMentions,
      }),
    ])

    const epicScore = scores.epicScore > 0
      ? scores.epicScore
      : Math.round((googleData.rating / 5) * 70)

    const restaurant: Restaurant = {
      id,
      name,
      city,
      address: '',
      googlePlaceId: placeId,
      cuisine: 'Dim Sum',
      priceRange,
      coords: { lat: 0, lng: 0 },
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
      verified: false,
      sources: {
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        blogMentions: buzz.blogMentions + buzz.tiktokMentions,
        lastUpdated: new Date().toISOString(),
      },
    }

    await upsertRestaurant(restaurant)

    return NextResponse.json(restaurant)
  } catch (err) {
    console.error('Add restaurant error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
