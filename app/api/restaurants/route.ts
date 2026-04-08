import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, seedIfEmpty } from '@/lib/db'
import { City } from '@/lib/types'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') as City | null

  let restaurants = await getAllRestaurants()

  // Seed from JSON if Supabase is empty
  if (restaurants.length === 0) {
    await seedIfEmpty()
    restaurants = await getAllRestaurants()
  }

  if (city && city !== ('Alle' as City)) {
    restaurants = restaurants.filter((r) => r.city === city)
  }

  return NextResponse.json(restaurants)
}
