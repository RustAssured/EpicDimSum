import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { restaurantId, note } = await request.json()
    if (!note || typeof note !== 'string' || note.length > 280) {
      return NextResponse.json({ error: 'Ongeldige notitie' }, { status: 400 })
    }

    await supabaseAdmin
      .from('checkins')
      .update({ note: note.trim() })
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Note error:', err)
    return NextResponse.json({ error: 'Er ging iets mis' }, { status: 500 })
  }
}
