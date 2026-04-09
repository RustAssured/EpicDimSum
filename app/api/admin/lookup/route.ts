import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('x-sync-secret')
  if (!syncSecret || authHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 })
  }

  const { name, city } = await request.json() as { name: string; city: string }
  if (!name || !city) {
    return NextResponse.json({ error: 'name and city are required' }, { status: 400 })
  }

  const textQuery = `${name} ${city} Nederland`

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1 }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `Places API error: ${text}` }, { status: 502 })
  }

  const data = await res.json()
  const place = data.places?.[0]

  if (!place) {
    return NextResponse.json({ error: 'Geen resultaat gevonden' }, { status: 404 })
  }

  return NextResponse.json({
    placeId: place.id,
    name: place.displayName?.text ?? name,
    address: place.formattedAddress ?? '',
  })
}
