import { NextRequest, NextResponse } from 'next/server'
import { getAllRestaurants, upsertRestaurant } from '@/lib/db'
import { verifyRestaurant, shouldRunToday } from '@/lib/quality-agent'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

async function runAudit(request: NextRequest) {
  // Auth: accept both CRON_SECRET and SYNC_SECRET for manual triggers
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.SYNC_SECRET
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  const syncHeader = request.headers.get('x-sync-secret')

  if (authHeader !== cronSecret && syncHeader !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if should run today
  const shouldRun = await shouldRunToday()
  if (!shouldRun) {
    return NextResponse.json({ skipped: true, reason: 'Not scheduled for today' })
  }

  // Curator model: agent only flags, never deletes, never changes verified.
  const mode = 'flag' as const
  const restaurants = await getAllRestaurants()

  // Log run start
  const { data: runData } = await getSupabaseAdmin()
    .from('agent_runs')
    .insert({
      run_type: 'audit',
      mode,
      restaurants_checked: restaurants.length,
    })
    .select()
    .single()

  const runId = runData?.id

  let flagged = 0
  const removed = 0
  const results = []

  for (const restaurant of restaurants) {
    try {
      const result = await verifyRestaurant(restaurant)
      results.push(result)

      if (result.verdict === 'remove' || result.verdict === 'flag') {
        // Surface the concern in the inbox without touching public visibility.
        await upsertRestaurant({
          ...restaurant,
          agentReason: `[${result.verdict.toUpperCase()}] ${result.reasoning} (confidence: ${result.confidence}%)`,
        })
        flagged++
      }

      // Respect rate limits
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error(`Agent audit failed for ${restaurant.name}:`, err)
    }
  }

  // Benchmark: Kaa Lun Palace
  const kaaLun = results.find(r =>
    r.restaurantName.toLowerCase().includes('kaa lun')
  )
  if (!kaaLun) {
    console.warn('[Agent] Benchmark: Kaa Lun Palace not in database — discovery needed')
  } else if (kaaLun.confidence < 75) {
    console.warn(`[Agent] Benchmark: Kaa Lun Palace confidence too low: ${kaaLun.confidence}%`)
  } else {
    console.log(`[Agent] Benchmark passed: Kaa Lun Palace at ${kaaLun.confidence}%`)
  }

  // Update run record
  if (runId) {
    await getSupabaseAdmin()
      .from('agent_runs')
      .update({
        completed_at: new Date().toISOString(),
        restaurants_flagged: flagged,
        restaurants_removed: removed,
        results,
      })
      .eq('id', runId)
  }

  return NextResponse.json({
    mode,
    checked: restaurants.length,
    flagged,
    removed,
    results: results.map(r => ({
      name: r.restaurantName,
      verdict: r.verdict,
      confidence: r.confidence,
      reasoning: r.reasoning,
    })),
  })
}

export async function POST(request: NextRequest) {
  return runAudit(request)
}

// Cron trigger (GET)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runAudit(request)
}
