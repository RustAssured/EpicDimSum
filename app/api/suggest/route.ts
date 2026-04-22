import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, upsertRestaurant, normalizeCity, isKnownCity } from '@/lib/db'
import { Restaurant, City, PriceRange } from '@/lib/types'
import { fetchGooglePlacesData, extractCityFromAddressComponents } from '@/lib/google-places'

// Simple in-memory rate limiter: max 5 suggestions per IP per day
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

function extractPlaceId(url: string): string | null {
  // Direct ChIJ... pattern anywhere in the URL
  const directMatch = url.match(/ChIJ[a-zA-Z0-9_-]{10,}/)
  if (directMatch) return directMatch[0]

  // Encoded in data param: !1sChIJ...
  const dataMatch = url.match(/!1s(ChIJ[a-zA-Z0-9_-]+)/)
  if (dataMatch) return dataMatch[1]

  return null
}

function slugify(name: string, city: string): string {
  return `${name} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Te veel suggesties vandaag, probeer morgen weer' },
      { status: 429 }
    )
  }

  let body: { mapsUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const { mapsUrl } = body
  if (!mapsUrl || typeof mapsUrl !== 'string' || mapsUrl.length > 2048) {
    return NextResponse.json({ error: 'Ongeldige URL' }, { status: 400 })
  }

  const placeId = extractPlaceId(mapsUrl)
  if (!placeId) {
    return NextResponse.json(
      { error: 'Geen Google Place ID gevonden in deze link. Kopieer de link direct vanuit Google Maps.' },
      { status: 422 }
    )
  }

  // Check if already in DB
  const existing = await getAllRestaurants()
  const alreadyExists = existing.find((r) => r.googlePlaceId === placeId)
  if (alreadyExists) {
    return NextResponse.json({
      success: true,
      message: `${alreadyExists.name} staat al in EpicDimSum! EpicScore: ${alreadyExists.epicScore}`,
      existing: true,
    })
  }

  // Extract real city from Google Places to avoid hardcoding Amsterdam
  let extractedCity: City = 'Amsterdam' as City
  try {
    const placeData = await fetchGooglePlacesData(placeId)
    const locality = extractCityFromAddressComponents(placeData.addressComponents)
    if (locality) {
      if (isKnownCity(locality)) {
        extractedCity = normalizeCity(locality)
      } else {
        console.warn(`[Suggest] Unknown city "${locality}" for place ${placeId}, using raw value`)
        extractedCity = locality as City
      }
    } else {
      console.warn(`[Suggest] Could not determine city for place ${placeId}, falling back to Amsterdam`)
    }
  } catch (err) {
    console.error(`[Suggest] Google Places fetch failed for ${placeId}:`, err)
  }

  // Create stub — real scoring happens on next sync cycle
  const stubId = slugify(`suggest-${placeId.slice(-8)}`, 'nl')
  const stub: Restaurant = {
    id: stubId,
    name: `Suggestie (${placeId.slice(-6)})`,
    city: extractedCity,
    address: '',
    googlePlaceId: placeId,
    cuisine: 'Dim Sum',
    priceRange: '€€' as PriceRange,
    coords: { lat: 0, lng: 0 },
    mustOrder: '',
    epicScore: 0,
    haGaoIndex: 0,
    scores: { google: 0, haGao: 0, buzz: 0, vibe: 0 },
    status: 'pending',
    sources: {
      googleRating: 0,
      googleReviewCount: 0,
      blogMentions: 0,
      lastUpdated: new Date().toISOString(),
    },
  }

  await upsertRestaurant(stub)

  return NextResponse.json({
    success: true,
    message: 'Bedankt! We beoordelen dit restaurant binnenkort.',
  })
}
