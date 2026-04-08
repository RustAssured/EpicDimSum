import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, deleteRestaurant } from '@/lib/db'
import { BLOCKLIST_KEYWORDS } from '@/lib/discovery'
import restaurantsSeed from '@/data/restaurants.json'

const SEED_IDS = new Set((restaurantsSeed as { id: string }[]).map((r) => r.id))

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const restaurants = await getAllRestaurants()
  const now = Date.now()
  const removed: string[] = []

  for (const r of restaurants) {
    // Never remove seed restaurants
    if (SEED_IDS.has(r.id)) continue

    const nameLower = r.name.toLowerCase()
    const isBlocklisted = BLOCKLIST_KEYWORDS.some((kw) => nameLower.includes(kw))

    const lastUpdatedMs = new Date(r.sources.lastUpdated).getTime()
    const isAbandonedZero = r.epicScore === 0 && (now - lastUpdatedMs) > 24 * 60 * 60 * 1000

    if (isBlocklisted || isAbandonedZero) {
      try {
        await deleteRestaurant(r.id)
        removed.push(r.name)
        console.log(`[Cleanup] Removed "${r.name}" (blocklisted=${isBlocklisted}, abandonedZero=${isAbandonedZero})`)
      } catch (err) {
        console.error(`[Cleanup] Failed to remove "${r.name}":`, err)
      }
    }
  }

  return NextResponse.json({ removed, count: removed.length })
}
