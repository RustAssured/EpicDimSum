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
  // Admin auth check
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

  // Step 1: Fetch Google Places data
  let googleData = { rating: restaurant.sources.googleRating, userRatingCount: restaurant.sources.googleReviewCount, reviews: [] as { text: { text: string }; rating: number }[] }
  try {
    googleData = await fetchGooglePlacesData(restaurant.googlePlaceId)
  } catch (err) {
    console.error(`Google Places fetch failed for ${params.id}:`, err)
  }

  const googleScore = normalizeGoogleScore(googleData.rating, googleData.userRatingCount)
  const reviewTexts = googleData.reviews.map((r) => r.text?.text ?? '')

  // Step 2: Fetch Iens data
  const iensData = await fetchIensData(restaurant.name, restaurant.city)

  // Step 3: Claude Haiku scoring
  const scores = await computeScoresWithClaude({
    name: restaurant.name,
    city: restaurant.city,
    googleRating: googleData.rating,
    googleReviewCount: googleData.userRatingCount,
    googleReviews: reviewTexts,
    iensText: iensData.rawText.slice(0, 1500),
  })

  // Step 4: Update restaurant data
  const haGaoScore = Math.round((scores.haGaoIndex / 5) * 100)

  const updated: Restaurant = {
    ...restaurant,
    haGaoIndex: scores.haGaoIndex,
    mustOrder: scores.mustOrder,
    epicScore: scores.epicScore,
    summary: scores.summary,
    reviewSnippets: reviewTexts.slice(0, 3),
    scores: {
      google: googleScore,
      haGao: haGaoScore,
      buzz: scores.buzzScore,
      vibe: scores.vibeScore,
    },
    sources: {
      googleRating: googleData.rating,
      googleReviewCount: googleData.userRatingCount,
      blogMentions: iensData.reviewCount ?? restaurant.sources.blogMentions,
      lastUpdated: new Date().toISOString(),
    },
  }

  restaurants[index] = updated
  await fs.writeFile(filePath, JSON.stringify(restaurants, null, 2), 'utf-8')

  return NextResponse.json(updated)
}
