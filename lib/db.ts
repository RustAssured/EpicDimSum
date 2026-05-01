import { getSupabase, getSupabaseAdmin } from './supabase'
import { Restaurant, City } from './types'
import restaurantsSeed from '@/data/restaurants.json'

// Normalize city strings from Supabase to canonical City values
const CITY_MAP: Record<string, City> = {
  amsterdam: 'Amsterdam',
  rotterdam: 'Rotterdam',
  'den haag': 'Den Haag',
  'the hague': 'Den Haag',
  'den haag (the hague)': 'Den Haag',
  utrecht: 'Utrecht',
  eindhoven: 'Eindhoven',
  groningen: 'Groningen',
  leeuwarden: 'Leeuwarden',
  assen: 'Assen',
  zwolle: 'Zwolle',
  arnhem: 'Arnhem',
  maastricht: 'Maastricht',
  middelburg: 'Middelburg',
  lelystad: 'Lelystad',
  "'s-hertogenbosch": "'s-Hertogenbosch",
  's-hertogenbosch': "'s-Hertogenbosch",
  'den bosch': "'s-Hertogenbosch",
}

export function normalizeCity(city: string): City {
  const key = city.toLowerCase().trim()
  return CITY_MAP[key] ?? (city as City)
}

export function isKnownCity(city: string): boolean {
  return city.toLowerCase().trim() in CITY_MAP
}

function normalizeRestaurant(r: Restaurant): Restaurant {
  return { ...r, city: normalizeCity(r.city as string) }
}

// Read all restaurants — try Supabase first, fall back to JSON seed
export async function getAllRestaurants(): Promise<Restaurant[]> {
  try {
    const { data, error } = await getSupabase()
      .from('restaurants')
      .select('data')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[DB] Supabase error, falling back to seed:', error)
      return (restaurantsSeed as Restaurant[]).map(normalizeRestaurant)
    }

    // If Supabase returns data (even just 1 row), use it — never fall back
    if (data && data.length > 0) {
      return data
        .map((row) => normalizeRestaurant(row.data as Restaurant))
        .sort((a, b) => b.epicScore - a.epicScore)
    }

    // Only fall back if truly empty
    console.log('[DB] Supabase empty, seeding from JSON')
    await seedIfEmpty()
    return (restaurantsSeed as Restaurant[]).map(normalizeRestaurant)
  } catch (err) {
    console.error('[DB] Connection failed, falling back to seed:', err)
    return (restaurantsSeed as Restaurant[]).map(normalizeRestaurant)
  }
}

// Public feed — single gate: admin must have published (verified === true).
// The engine no longer decides what is public.
export function isTrustedForPublicFeed(r: Restaurant): boolean {
  return r.verified === true
}

// Fetch check-in counts per restaurant in a single query.
// Returns a Map of restaurant_id -> count. Falls back to empty map on error.
async function getCheckinCounts(): Promise<Map<string, number>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('checkins')
      .select('restaurant_id')

    if (error || !data) return new Map()

    const counts = new Map<string, number>()
    for (const row of data as { restaurant_id: string }[]) {
      counts.set(row.restaurant_id, (counts.get(row.restaurant_id) ?? 0) + 1)
    }
    return counts
  } catch {
    return new Map()
  }
}

export async function getPublicRestaurants(): Promise<Restaurant[]> {
  const [all, checkinCounts] = await Promise.all([
    getAllRestaurants(),
    getCheckinCounts(),
  ])
  return all
    .filter(isTrustedForPublicFeed)
    .map((r) => ({
      ...r,
      communityCheckins: checkinCounts.get(r.id) ?? r.communityCheckins ?? 0,
    }))
}

// Read single restaurant
export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  try {
    const { data, error } = await getSupabase()
      .from('restaurants')
      .select('data')
      .eq('id', id)
      .single()

    if (error || !data) {
      const seed = restaurantsSeed as Restaurant[]
      return seed.find((r) => r.id === id) ?? null
    }

    return normalizeRestaurant(data.data as Restaurant)
  } catch {
    const seed = restaurantsSeed as Restaurant[]
    return seed.find((r) => r.id === id) ?? null
  }
}

// Write restaurant (admin only)
export async function upsertRestaurant(restaurant: Restaurant): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('restaurants')
    .upsert({
      id: restaurant.id,
      data: restaurant,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`)
}

// Delete restaurant (admin only)
export async function deleteRestaurant(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('restaurants')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Supabase delete failed: ${error.message}`)
}

// Add a Google Place ID to the blocklist so it is skipped by future scans.
export async function addToBlocklist(args: {
  googlePlaceId: string
  name: string
  reason?: string
}): Promise<void> {
  const { googlePlaceId, name, reason } = args
  if (!googlePlaceId) return // nothing to block
  try {
    const { error } = await getSupabaseAdmin()
      .from('blocklist')
      .upsert(
        {
          google_place_id: googlePlaceId,
          name,
          reason: reason ?? null,
        },
        { onConflict: 'google_place_id', ignoreDuplicates: true }
      )
    if (error) {
      console.error('[Blocklist] upsert failed:', error.message)
    }
  } catch (err) {
    console.error('[Blocklist] upsert threw:', err)
  }
}

// Returns true if the given Google Place ID is on the blocklist.
export async function isBlocked(googlePlaceId: string): Promise<boolean> {
  if (!googlePlaceId) return false
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('blocklist')
      .select('google_place_id')
      .eq('google_place_id', googlePlaceId)
      .maybeSingle()
    if (error) {
      console.error('[Blocklist] check failed:', error.message)
      return false
    }
    return !!data
  } catch (err) {
    console.error('[Blocklist] check threw:', err)
    return false
  }
}

// Returns the set of all blocked Google Place IDs (for batch checks).
export async function getBlockedPlaceIds(): Promise<Set<string>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('blocklist')
      .select('google_place_id')
    if (error || !data) return new Set()
    return new Set(
      (data as { google_place_id: string }[]).map((row) => row.google_place_id)
    )
  } catch {
    return new Set()
  }
}

// Upsert ALL seed entries to Supabase — ensures new seeds appear without wiping existing data
export async function syncSeedToSupabase(): Promise<void> {
  const seed = restaurantsSeed as Restaurant[]
  for (const r of seed) {
    try {
      // Only upsert if not already in Supabase (don't overwrite real synced data)
      const { data } = await getSupabaseAdmin()
        .from('restaurants')
        .select('id')
        .eq('id', r.id)
        .single()

      if (!data) {
        await upsertRestaurant(r)
      }
    } catch {
      // Row doesn't exist — insert it
      await upsertRestaurant(r).catch(console.error)
    }
  }
}

// Legacy alias kept for any callers
export async function seedIfEmpty(): Promise<void> {
  await syncSeedToSupabase()
}

// Admin-only: fetch ALL restaurants using the service-role client, bypassing RLS.
// Never falls back to seed data — returns empty array on error so the caller can decide.
export async function getAllRestaurantsAdmin(): Promise<Restaurant[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('data')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[DB Admin] Supabase error fetching all restaurants:', error.message)
    return []
  }
  if (!data || data.length === 0) return []

  return data
    .map((row) => normalizeRestaurant(row.data as Restaurant))
    .sort((a, b) => (b.epicScore ?? 0) - (a.epicScore ?? 0))
}

export interface Compliment {
  id: string
  text: string
  createdAt: string
}

export async function getCompliments(restaurantId: string): Promise<Compliment[]> {
  try {
    const { data, error } = await getSupabase()
      .from('compliments')
      .select('id, text, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data) return []
    return data.map((row) => ({
      id: row.id as string,
      text: row.text as string,
      createdAt: row.created_at as string,
    }))
  } catch {
    return []
  }
}
