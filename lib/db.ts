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

    if (error || !data || data.length === 0) {
      return restaurantsSeed as Restaurant[]
    }

    return data
      .map((row) => normalizeRestaurant(row.data as Restaurant))
      .sort((a, b) => b.epicScore - a.epicScore)
  } catch {
    return restaurantsSeed as Restaurant[]
  }
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

// Seed Supabase from JSON if table is empty
export async function seedIfEmpty(): Promise<void> {
  const { count } = await getSupabaseAdmin()
    .from('restaurants')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) === 0) {
    const seed = restaurantsSeed as Restaurant[]
    for (const r of seed) {
      await upsertRestaurant(r)
    }
  }
}
