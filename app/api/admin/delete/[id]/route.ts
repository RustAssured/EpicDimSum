import { NextRequest, NextResponse } from 'next/server'
import { deleteRestaurant } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteRestaurant(params.id)
  return NextResponse.json({ success: true, id: params.id })
}
