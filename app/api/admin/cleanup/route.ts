import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, deleteRestaurant } from '@/lib/db'
import { BLOCKLIST_KEYWORDS } from '@/lib/discovery'
import restaurantsSeed from '@/data/restaurants.json'

const SEED_IDS = new Set((restaurantsSeed as { id: string }[]).map((r) => r.id))

function isNonDimSum(r: { name: string; summary?: string; mustOrder?: string; haGaoIndex?: number; dumplingMentionScore?: number }): boolean {
  const summary = (r.summary ?? '').toLowerCase()
  const mustOrder = (r.mustOrder ?? '').toLowerCase()
  const name = r.name.toLowerCase()

  return (
    summary.includes('geen dim sum') ||
    summary.includes('pastarestaurant') ||
    summary.includes('italiaans') ||
    summary.includes('japans restaurant') ||
    mustOrder.includes('niet van toepassing') ||
    mustOrder.includes('geen dumplings') ||
    ((r.haGaoIndex ?? 0) === 0 && (r.dumplingMentionScore ?? 0) === 0) ||
    name.includes('spaghett') ||
    name.includes('pizza') ||
    name.includes('pasta') ||
    name.includes('ramen') ||
    name.includes('sushi') ||
    name.includes('kebab') ||
    name.includes('burger')
  )
}

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')

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
    const isObviouslyNotDimSum = mode === 'non-dim-sum' ? isNonDimSum(r) : false

    if (isBlocklisted || isAbandonedZero || isObviouslyNotDimSum) {
      try {
        await deleteRestaurant(r.id)
        removed.push(r.name)
        console.log(`[Cleanup] Removed "${r.name}" (blocklisted=${isBlocklisted}, abandonedZero=${isAbandonedZero}, nonDimSum=${isObviouslyNotDimSum})`)
      } catch (err) {
        console.error(`[Cleanup] Failed to remove "${r.name}":`, err)
      }
    }
  }

  return NextResponse.json({ removed, count: removed.length })
}
