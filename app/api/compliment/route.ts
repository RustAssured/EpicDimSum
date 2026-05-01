import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, text } = await request.json()

    const trimmed = typeof text === 'string' ? text.trim() : ''
    if (!restaurantId || !trimmed) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }
    if (trimmed.length > 140) {
      return NextResponse.json({ error: 'Compliment te lang' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from('compliments')
      .insert({ restaurant_id: restaurantId, text: trimmed })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
