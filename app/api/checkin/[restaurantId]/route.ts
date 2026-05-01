import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + 'epicdimsum_salt').digest('hex').slice(0, 16)
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { restaurantId: string } },
) {
  try {
    const { journalNote } = await request.json()
    const note = typeof journalNote === 'string' ? journalNote.trim() : ''

    if (note.length > 280) {
      return NextResponse.json({ error: 'Notitie te lang' }, { status: 400 })
    }

    const ipHash = hashIp(getIp(request))
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { error } = await getSupabaseAdmin()
      .from('checkins')
      .update({ journal_note: note || null })
      .eq('restaurant_id', params.restaurantId)
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
