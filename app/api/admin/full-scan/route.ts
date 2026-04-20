import { NextRequest, NextResponse } from 'next/server'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { getAllRestaurants, upsertRestaurant } from '@/lib/db'
import { discoverNewSpots } from '@/lib/discovery'

export const runtime = 'nodejs'
export const maxDuration = 300

function slugify(name: string, city: string): string {
  return `${name} ${city}`
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
        const basicRestaurant: Restaurant = {
          id,
          name: spot.name,
          city: spot.city as City,
          address: spot.address,
          googlePlaceId: spot.googlePlaceId,
          cuisine: 'Dim Sum',
          priceRange: '€€' as PriceRange,
          coords: spot.coords,
          mustOrder: 'Wordt binnenkort beoordeeld door Gao',
          epicScore: 0,
          haGaoIndex: 0,
          verified: false,
          scores: { google: 0, haGao: 0, buzz: 0, vibe: 0 },
          status: 'open',
          sources: {
            googleRating: spot.googleRating,
            googleReviewCount: spot.googleReviewCount,
            blogMentions: 0,
            lastUpdated: new Date().toISOString(),
          },
        }

        await upsertRestaurant(basicRestaurant)
        existingSlugs.add(id)
        added++
        addedNames.push(spot.name)
      } catch (err) {
        console.error(`Full-scan: failed to add ${spot.name}:`, err)
        skipped++
      }
    }

    return NextResponse.json({
      found: newSpots.length,
      added,
      skipped,
      restaurants: addedNames,
      note: 'Restaurants toegevoegd als concept, gebruik Sync alle om scores te berekenen',
    })
  } catch (err) {
    console.error('Full-scan error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
