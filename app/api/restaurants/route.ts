import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants } from '@/lib/db'
import { City } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') as City | null

  let restaurants = await getAllRestaurants()

  if (city && city !== ('Alle' as City)) {
    restaurants = restaurants.filter((r) => r.city === city)
  }

  return NextResponse.json(restaurants)
}
