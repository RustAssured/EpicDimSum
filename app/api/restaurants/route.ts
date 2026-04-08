import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, syncSeedToSupabase } from '@/lib/db'
import { City } from '@/lib/types'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') as City | null

  // Always sync seed to Supabase so new seed entries (e.g. Utrecht/Eindhoven) appear
  await syncSeedToSupabase()

  let restaurants = await getAllRestaurants()

  if (city && city !== ('Alle' as City)) {
    restaurants = restaurants.filter((r) => r.city === city)
  }

  return NextResponse.json(restaurants)
}
