import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById, upsertRestaurant } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const restaurant = await getRestaurantById(params.id)
  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await upsertRestaurant({ ...restaurant, verified: true })
  return NextResponse.json({ success: true })
}
