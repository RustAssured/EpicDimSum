import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { upsertRestaurant, getAllRestaurants } from '@/lib/db'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
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

    // Duplicate check — reject if same placeId or same slug already exists
    const existing = await getAllRestaurants()
    const duplicate = existing.find((r) => r.googlePlaceId === placeId || r.id === id)
    if (duplicate) {
      return NextResponse.json({ error: 'Restaurant bestaat al' }, { status: 409 })
    }

    // Step 1: Fetch Google Places data
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
    const reviewTexts = googleData.reviews.map((r) => r.text?.text ?? '').filter(Boolean)

    // Step 2: Iens data
    let iensText = ''
    let iensReviewCount = 0
    try {
      const iensData = await fetchIensData(name, city)
      iensText = iensData.rawText.slice(0, 1500)
      iensReviewCount = iensData.reviewCount ?? 0
    } catch (err) {
      console.error('Iens fetch failed:', err)
    }

    // Step 3: Run buzz + Claude in parallel
    const [buzz, scores] = await Promise.all([
      computeBuzzScore(name, city, iensReviewCount),
      computeScoresWithClaude({
        name,
        city,
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        googleReviews: reviewTexts,
        iensText,
      }),
    ])

    // Step 4: Build full Restaurant object
    // Fallback epicScore if Claude returns 0 (e.g. no reviews available)
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

    // Step 5: Upsert to Supabase
    await upsertRestaurant(restaurant)

    return NextResponse.json(restaurant)
  } catch (err) {
    console.error('Add restaurant error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
