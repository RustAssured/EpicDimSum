import { NextRequest, NextResponse } from 'next/server'
import { deleteRestaurant, getRestaurantById, addToBlocklist } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional reason in body; tolerate missing/invalid JSON (older callers).
  const body: { reason?: unknown } = await request.json().catch(() => ({}))
  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 200)
      : undefined

  // Look up restaurant BEFORE deletion so we can record place_id + name on the blocklist.
  const restaurant = await getRestaurantById(params.id)

  if (restaurant?.googlePlaceId) {
    await addToBlocklist({
      googlePlaceId: restaurant.googlePlaceId,
      name: restaurant.name,
      reason,
    })
  }

  await deleteRestaurant(params.id)
  return NextResponse.json({ success: true, id: params.id })
}
