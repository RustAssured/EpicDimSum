import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, deleteRestaurant } from '@/lib/db'
import restaurantsSeed from '@/data/restaurants.json'

const SEED_IDS = new Set((restaurantsSeed as { id: string }[]).map((r) => r.id))

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const all = await getAllRestaurants()

  // Build a set of names from non-seed restaurants (the "real" synced data)
  const realNames = new Set(
    all
      .filter((r) => !SEED_IDS.has(r.id))
      .map((r) => r.name.toLowerCase().trim())
  )

  const removed: string[] = []

  for (const r of all) {
    if (!SEED_IDS.has(r.id)) continue

    // Only remove seed entry if a real synced version exists with a similar name
    const seedNameNorm = r.name.toLowerCase().trim()
    const realNamesArr = Array.from(realNames)
    const hasRealVersion = realNames.has(seedNameNorm) ||
      realNamesArr.some((n) => {
        const seedWords = seedNameNorm.split(/\s+/)
        return seedWords.length >= 2 && seedWords.slice(0, 2).every((w) => n.includes(w))
      })

    if (hasRealVersion) {
      try {
        await deleteRestaurant(r.id)
        removed.push(r.name)
        console.log(`[CleanupSeeds] Removed seed "${r.name}" — real version exists`)
      } catch (err) {
        console.error(`[CleanupSeeds] Failed to remove "${r.name}":`, err)
      }
    }
  }

  return NextResponse.json({ removed, count: removed.length })
}
