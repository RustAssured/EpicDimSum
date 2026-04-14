import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants } from '@/lib/db'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const restaurants = await getAllRestaurants()
  return NextResponse.json(restaurants)
}
