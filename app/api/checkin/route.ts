import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

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

async function getCounts(restaurantId: string) {
  const { data } = await getSupabaseAdmin()
    .from('checkins')
    .select('rating')
    .eq('restaurant_id', restaurantId)

  return {
    fire: data?.filter(c => c.rating === 'fire').length ?? 0,
    solid: data?.filter(c => c.rating === 'solid').length ?? 0,
    meh: data?.filter(c => c.rating === 'meh').length ?? 0,
    total: data?.length ?? 0,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, rating } = await request.json()

    if (!restaurantId || !['fire', 'solid', 'meh'].includes(rating)) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
    }

    const ip = getIp(request)
    const ipHash = hashIp(ip)

    // Resolve user_id from Bearer token if present
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await getSupabaseAdmin().auth.getUser(token)
      userId = user?.id ?? null
    }

    // Rate limit: max 1 check-in per restaurant per IP per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await getSupabaseAdmin()
      .from('checkins')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      const summary = await getCounts(restaurantId)
      return NextResponse.json({
        success: false,
        alreadyCheckedIn: true,
        summary,
      })
    }

    const { error } = await getSupabaseAdmin()
      .from('checkins')
      .insert({ restaurant_id: restaurantId, rating, ip_hash: ipHash, user_id: userId })

    if (error) throw error

    const summary = await getCounts(restaurantId)
    return NextResponse.json({ success: true, summary })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurantId')
  if (!restaurantId) {
    return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })
  }
  const summary = await getCounts(restaurantId)
  return NextResponse.json(summary)
}
