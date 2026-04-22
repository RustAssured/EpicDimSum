/**
 * One-time migration: correct Fu Dumplings city Amsterdam → Rotterdam.
 *
 * Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/fix-fu-dumplings-city.ts
 */

import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  // Find Fu Dumplings with wrong city
  const { data: candidates, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name, city, address')
    .ilike('name', '%Fu Dumplings%')
    .eq('city', 'Amsterdam')

  if (fetchError) {
    console.error('Fetch error:', fetchError)
    process.exit(1)
  }

  if (!candidates || candidates.length === 0) {
    console.log('No matching records found (may already be fixed).')
    process.exit(0)
  }

  for (const r of candidates) {
    console.log(`Found: id=${r.id}, name="${r.name}", city=${r.city}, address="${r.address}"`)

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ city: 'Rotterdam' })
      .eq('id', r.id)

    if (updateError) {
      console.error(`Failed to update ${r.id}:`, updateError)
    } else {
      console.log(`Updated: ${r.name} — city Amsterdam → Rotterdam`)
    }
  }
}

main()
