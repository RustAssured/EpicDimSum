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
}

function normalizeCity(city: string): City {
  const key = city.toLowerCase().trim()
  return CITY_MAP[key] ?? (city as City)
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

// Public feed — filtered for quality (used by home page)
export function isTrustedForPublicFeed(r: Restaurant): boolean {
  if ((r.status as string) === 'pending') return false
  if (r.epicScore < 20) return false

  // Hard rule: if system explicitly detected this is NOT dim sum, exclude
  const summary = (r.summary ?? '').toLowerCase()
  const mustOrder = (r.mustOrder ?? '').toLowerCase()
  const notDimSum =
    summary.includes('geen dim sum') ||
    summary.includes('niet geschikt') ||
    summary.includes('pastarestaurant') ||
    summary.includes('italiaans') ||
    mustOrder.includes('niet van toepassing') ||
    mustOrder.includes('geen dumplings')

  if (notDimSum) return false

  // Hard rule: zero Ha Gao AND zero dumpling mentions = not dim sum
  const haGao = r.haGaoIndex ?? 0
  const mentions = r.dumplingMentionScore ?? 0
  if (haGao === 0 && mentions === 0) return false

  // Soft quality floor
  if (mustOrder.includes('bepaald') || mustOrder.includes('onvoldoende')) return false
  if (!r.mustOrder || r.mustOrder.trim() === '') return false

  // Must have at least one dumpling signal
  const hasDumplingInMustOrder = mustOrder
    .match(/ha gao|siu mai|dumpling|har gow|cheung fun|gestoomd|garnaal|dim sum/)
  const hasDumplingInSummary = summary
    .match(/ha gao|siu mai|dumpling|dim sum|gestoomd/)

  if (haGao < 1.5 && mentions < 10 && !hasDumplingInMustOrder && !hasDumplingInSummary) {
    return false
  }

  return true
}

export async function getPublicRestaurants(): Promise<Restaurant[]> {
  const all = await getAllRestaurants()
  return all.filter(isTrustedForPublicFeed)
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
