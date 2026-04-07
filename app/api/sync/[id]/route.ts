import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Restaurant } from '@/lib/types'
import { fetchGooglePlacesData, normalizeGoogleScore } from '@/lib/google-places'
import { fetchIensData } from '@/lib/iens-scraper'
import { computeScoresWithClaude } from '@/lib/score-engine'

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

    const filePath = path.join(process.cwd(), 'data', 'restaurants.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    const restaurants: Restaurant[] = JSON.parse(raw)
    const index = restaurants.findIndex((r) => r.id === params.id)
    if (index === -1) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = restaurants[index]

    let googleData = {
      rating: restaurant.sources.googleRating,
      userRatingCount: restaurant.sources.googleReviewCount,
      reviews: [] as { text: { text: string }; rating: number }[]
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

    const scores = await computeScoresWithClaude({
      name: restaurant.name,
      city: restaurant.city,
      googleRating: googleData.rating,
      googleReviewCount: googleData.userRatingCount,
      googleReviews: reviewTexts,
      iensText,
    })

    const updated: Restaurant = {
      ...restaurant,
      haGaoIndex: scores.haGaoIndex,
      mustOrder: scores.mustOrder,
      epicScore: scores.epicScore,
      summary: scores.summary,
      reviewSnippets: reviewTexts.slice(0, 3),
      scores: {
        google: googleScore,
        haGao: Math.round((scores.haGaoIndex / 5) * 100),
        buzz: scores.buzzScore,
        vibe: scores.vibeScore,
      },
      sources: {
        googleRating: googleData.rating,
        googleReviewCount: googleData.userRatingCount,
        blogMentions: iensReviewCount,
        lastUpdated: new Date().toISOString(),
      },
    }

    return NextResponse.json({ success: true, restaurant: updated })

  } catch (err) {
    console.error('Sync error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
