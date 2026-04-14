import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    let body: { message?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }

    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
      return NextResponse.json({ error: 'Ongeldig bericht' }, { status: 400 })
    }

    await getSupabaseAdmin().from('bug_reports').insert({
      message: message.trim(),
      created_at: new Date().toISOString(),
      status: 'open',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Bug report error:', err)
    return NextResponse.json({ error: 'Er ging iets mis' }, { status: 500 })
  }
}
