import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Restaurant } from '@/lib/types'

// One-time admin reset: marks every restaurant as not public (verified: false).
// The admin must then re-publish each one manually via the Restaurants tab.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: rows, error: fetchErr } = await supabase
    .from('restaurants')
    .select('id, data')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ unverified: 0 })
  }

  let unverified = 0
  for (const row of rows as { id: string; data: Restaurant }[]) {
    const wasVerified = row.data?.verified === true
    const next: Restaurant = { ...row.data, verified: false }
    const { error: upErr } = await supabase
      .from('restaurants')
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (upErr) {
      console.error(`[reset-public] upsert failed for ${row.id}:`, upErr.message)
      continue
    }
    if (wasVerified) unverified++
  }

  console.log(`[reset-public] Unverified ${unverified} restaurant(s) (${rows.length} total touched)`)
  return NextResponse.json({ unverified, total: rows.length })
}
