import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const restaurant = await getRestaurantById(params.id)
  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(restaurant)
}
