import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Restaurant } from '@/lib/types'

async function countTable(supabase: ReturnType<typeof getSupabaseAdmin>, table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) {
    console.error(`[Reset] count(${table}) failed:`, error.message)
    return -1
  }
  return count ?? 0
}

// One-time admin reset: marks every restaurant as not public (verified: false).
// The admin must then re-publish each one manually via the Restaurants tab.
// ONLY updates restaurants.data.verified — no rows are deleted anywhere.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  // Pre-check: count all three tables before touching anything
  const [restaurantsBefore, checkinsBefore, complimentsBefore] = await Promise.all([
    countTable(supabase, 'restaurants'),
    countTable(supabase, 'checkins'),
    countTable(supabase, 'compliments'),
  ])
  console.log('[Reset] Pre-check:', {
    restaurants: restaurantsBefore,
    checkins: checkinsBefore,
    compliments: complimentsBefore,
  })

  const { data: rows, error: fetchErr } = await supabase
    .from('restaurants')
    .select('id, data')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({
      restaurantsUpdated: 0,
      checkins: { before: checkinsBefore, after: checkinsBefore },
      compliments: { before: complimentsBefore, after: complimentsBefore },
      deletesPerformed: 0,
    })
  }

  // Update only: set verified = false in the data JSONB column.
  // No rows are deleted from any table.
  let restaurantsUpdated = 0
  for (const row of rows as { id: string; data: Restaurant }[]) {
    const next: Restaurant = { ...row.data, verified: false }
    const { error: upErr } = await supabase
      .from('restaurants')
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (upErr) {
      console.error(`[Reset] update failed for ${row.id}:`, upErr.message)
      continue
    }
    restaurantsUpdated++
  }

  // Post-check: verify row counts are unchanged (no accidental deletes)
  const [restaurantsAfter, checkinsAfter, complimentsAfter] = await Promise.all([
    countTable(supabase, 'restaurants'),
    countTable(supabase, 'checkins'),
    countTable(supabase, 'compliments'),
  ])
  console.log('[Reset] Post-check:', {
    restaurants: restaurantsAfter,
    checkins: checkinsAfter,
    compliments: complimentsAfter,
  })

  return NextResponse.json({
    restaurantsUpdated,
    checkins: { before: checkinsBefore, after: checkinsAfter },
    compliments: { before: complimentsBefore, after: complimentsAfter },
    deletesPerformed: 0,
  })
}
