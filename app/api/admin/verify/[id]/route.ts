import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById, upsertRestaurant } from '@/lib/db'
import { Restaurant } from '@/lib/types'

// Set a restaurant's public visibility. POST {} → publish, POST {verified:false} → hide.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const verified = body?.verified !== false // default true; only false when explicitly false

  const restaurant = await getRestaurantById(params.id)
  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated: Restaurant = { ...restaurant, verified }
  // Publishing implies the admin has reviewed any prior agent flag.
  if (verified) delete updated.agentReason

  await upsertRestaurant(updated)
  return NextResponse.json({ success: true, verified })
}
