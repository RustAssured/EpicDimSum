import { NextRequest, NextResponse } from 'next/server'
import { upsertRestaurant, normalizeCity, isKnownCity, isBlocked } from '@/lib/db'
import { Restaurant, City, PriceRange, CITY_LIST } from '@/lib/types'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  searchPlacesByText,
  extractCityFromAddressComponents,
  type PlacesSearchCandidate,
} from '@/lib/google-places'

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

function isValidCity(city: string): city is City {
  return (CITY_LIST as string[]).includes(city)
}

const FRIENDLY_SUCCESS = 'Dank je! Gao gaat deze plek bekijken.'
const PREVIOUSLY_BLOCKED_PREFIX = '[VOORHEEN GEBLOKKEERD]'

function tagNoteAsPreviouslyBlocked(note: string | undefined): string {
  const trimmed = note?.trim() ?? ''
  if (trimmed.startsWith(PREVIOUSLY_BLOCKED_PREFIX)) return trimmed
  return trimmed.length > 0
    ? `${PREVIOUSLY_BLOCKED_PREFIX} ${trimmed}`
    : `${PREVIOUSLY_BLOCKED_PREFIX} (geen extra notitie)`
}

function successResponse() {
  return NextResponse.json({ ok: true, message: FRIENDLY_SUCCESS })
}

function buildStub(args: {
  name: string
  city: City
  placeId: string
  note?: string
  submittedBy?: string
}): Restaurant {
  const { name, city, placeId, note, submittedBy } = args
  const idSeed = placeId
    ? `suggest-${placeId.slice(-8)}`
    : `suggest-${slugify(name)}-${Date.now().toString(36)}`
  const stubId = slugify(`${idSeed}-${city}`)

  return {
    id: stubId,
    name,
    city,
    address: '',
    googlePlaceId: placeId,
    cuisine: 'Dim Sum',
    priceRange: '€€' as PriceRange,
    coords: { lat: 0, lng: 0 },
    mustOrder: '',
    epicScore: 0,
    haGaoIndex: 0,
    scores: { google: 0, haGao: 0, buzz: 0, vibe: 0 },
    status: 'suggested',
    verified: false,
    source: 'user',
    note: note?.trim() ? note.trim() : undefined,
    submittedBy,
    summary: note?.trim() ? `Suggestie van bezoeker: ${note.trim()}` : undefined,
    sources: {
      googleRating: 0,
      googleReviewCount: 0,
      blogMentions: 0,
      lastUpdated: new Date().toISOString(),
    },
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Te veel suggesties vandaag, probeer het morgen opnieuw.' },
      { status: 429 }
    )
  }

  let body: { name?: unknown; city?: unknown; note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  const rawCity = typeof body.city === 'string' ? body.city.trim() : ''
  const rawNote = typeof body.note === 'string' ? body.note.trim() : ''

  if (!rawName || rawName.length > 120) {
    return NextResponse.json(
      { error: 'Geef een geldige restaurantnaam op.' },
      { status: 400 }
    )
  }

  if (!isValidCity(rawCity)) {
    return NextResponse.json(
      { error: 'Kies een stad uit de lijst.' },
      { status: 400 }
    )
  }

  if (rawNote.length > 200) {
    return NextResponse.json(
      { error: 'Notitie mag maximaal 200 tekens zijn.' },
      { status: 400 }
    )
  }

  const userCity: City = rawCity
  const note = rawNote.length > 0 ? rawNote : undefined

  // Resolve submitter email from Bearer token if present
  let submittedBy: string | undefined
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await getSupabaseAdmin().auth.getUser(token)
      submittedBy = user?.email ?? undefined
    } catch {
      // Skip gracefully — anonymous suggestion
    }
  }

  // If no API key is configured, save the suggestion without lookup.
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    try {
      await upsertRestaurant(
        buildStub({ name: rawName, city: userCity, placeId: '', note, submittedBy })
      )
    } catch (err) {
      console.error('[Suggest] Failed to save suggestion (no API key path):', err)
    }
    return successResponse()
  }

  let candidates: PlacesSearchCandidate[] = []
  try {
    candidates = await searchPlacesByText(rawName, userCity)
  } catch (err) {
    console.warn('[Suggest] Places searchText failed:', err)
  }

  // Resolve final city using Places address components when available; else user's choice.
  function resolveCity(candidate: PlacesSearchCandidate | undefined): City {
    if (!candidate) return userCity
    const locality = extractCityFromAddressComponents(candidate.addressComponents)
    if (locality && isKnownCity(locality)) return normalizeCity(locality)
    if (locality) {
      console.warn(
        `[Suggest] Unknown locality "${locality}" for placeId ${candidate.placeId}, using user-selected city`
      )
    }
    return userCity
  }

  // Branch 1: 0 results — save suggestion record without placeId, respond success
  if (candidates.length === 0) {
    try {
      await upsertRestaurant(
        buildStub({ name: rawName, city: userCity, placeId: '', note, submittedBy })
      )
    } catch (err) {
      console.error('[Suggest] Failed to save 0-result suggestion:', err)
    }
    return successResponse()
  }

  const top = candidates[0]
  const highConfidence =
    candidates.length === 1 && (top.userRatingCount ?? 0) >= 5

  // Branch 2: exactly 1 high-confidence result — create stub with placeId, normal pipeline
  if (highConfidence) {
    const finalCity = resolveCity(top)
    const blocked = await isBlocked(top.placeId)
    const finalNote = blocked ? tagNoteAsPreviouslyBlocked(note) : note
    const stub = buildStub({
      name: top.name || rawName,
      city: finalCity,
      placeId: top.placeId,
      note: finalNote,
      submittedBy,
    })
    // Previously-blocked spots stay 'suggested' so admin reviews before scoring;
    // fresh spots go straight into the pending pipeline.
    stub.status = blocked ? 'suggested' : 'pending'
    try {
      await upsertRestaurant(stub)
    } catch (err) {
      console.error('[Suggest] Failed to upsert high-confidence stub:', err)
    }
    return successResponse()
  }

  // Branch 3: multiple results OR 1 low-confidence result —
  // save suggestion record marked for admin review with the top candidate's placeId.
  const finalCity = resolveCity(top)
  const blocked = top.placeId ? await isBlocked(top.placeId) : false
  const finalNote = blocked ? tagNoteAsPreviouslyBlocked(note) : note
  const stub = buildStub({
    name: rawName,
    city: finalCity,
    placeId: top.placeId ?? '',
    note: finalNote,
    submittedBy,
  })
  try {
    await upsertRestaurant(stub)
  } catch (err) {
    console.error('[Suggest] Failed to upsert review-needed suggestion:', err)
  }
  return successResponse()
}
