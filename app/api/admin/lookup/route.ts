import { NextRequest, NextResponse } from 'next/server'
import { searchGooglePlaceByText } from '@/lib/google-places'

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, city } = await request.json() as { name: string; city: string }
  if (!name || !city) {
    return NextResponse.json({ error: 'name and city are required' }, { status: 400 })
  }

  const result = await searchGooglePlaceByText(`${name} ${city} Nederland`)
  if (!result) {
    return NextResponse.json({ error: 'Geen resultaat gevonden' }, { status: 404 })
  }

  return NextResponse.json(result)
}
