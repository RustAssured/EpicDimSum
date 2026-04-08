import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, upsertRestaurant } from '@/lib/db'

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const restaurants = await getAllRestaurants()
  let count = 0
  for (const r of restaurants) {
    if (r.epicScore > 20 && r.haGaoIndex > 0) {
      await upsertRestaurant({ ...r, verified: true })
      count++
    }
  }

  return NextResponse.json({ success: true, verified: count })
}
