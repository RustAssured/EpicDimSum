import Anthropic from '@anthropic-ai/sdk'
import { fetchGooglePlacesData } from './google-places'
import { getSupabaseAdmin } from './supabase'
import { Restaurant } from './types'

const client = new Anthropic()

export interface VerificationResult {
  restaurantId: string
  restaurantName: string
  confidence: number  // 0-100
  verdict: 'keep' | 'flag' | 'remove'
  reasoning: string
  signals: string[]
}

// Core verification: is this actually a dim sum restaurant?
export async function verifyRestaurant(restaurant: Restaurant): Promise<VerificationResult> {
  // Step 1: Get fresh Google Places data
  let googleData = {
    rating: restaurant.sources.googleRating,
    userRatingCount: restaurant.sources.googleReviewCount,
    reviews: [] as { text: { text: string }; rating: number }[],
  }

  try {
    googleData = await fetchGooglePlacesData(restaurant.googlePlaceId)
  } catch {
    // Use existing data if fetch fails
  }

  const reviewTexts = googleData.reviews
    .map(r => r.text?.text ?? '')
    .filter(Boolean)
    .join('\n---\n')
    .slice(0, 2000)

  // Step 2: Claude Haiku analyzes dim sum signals
  const prompt = `You are a dim sum restaurant verification agent. Your job is to determine if a restaurant actually serves dim sum / dumplings as a significant part of their menu.

Restaurant: ${restaurant.name}
City: ${restaurant.city}
Current mustOrder: ${restaurant.mustOrder ?? 'unknown'}
Current summary: ${restaurant.summary ?? 'unknown'}
Google reviews sample:
${reviewTexts || 'No reviews available'}

Analyze for these dim sum signals:
STRONG POSITIVE: ha gao, har gow, siu mai, cheung fun, char siu bao, dim sum, yum cha, dumplings, gestoomd, trolley/karretje, bamboo steamer, garnaalendumplings
WEAK POSITIVE: Chinese restaurant, Cantonese, Asian restaurant with dumplings
NEGATIVE: purely Italian, Japanese (ramen/sushi only), burger, pizza, kebab, Indian, no mention of dumplings anywhere

Return ONLY valid JSON:
{
  "confidence": <int 0-100, how confident are you this is a genuine dim sum spot>,
  "verdict": <"keep" if >=75, "flag" if 50-74, "remove" if <50>,
  "reasoning": "<one sentence in Dutch explaining the verdict>",
  "signals": ["<signal1>", "<signal2>"] // list of evidence found
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response')

  const cleaned = content.text.trim().replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    confidence: Number(parsed.confidence),
    verdict: parsed.verdict as 'keep' | 'flag' | 'remove',
    reasoning: String(parsed.reasoning),
    signals: parsed.signals ?? [],
  }
}

// Determine agent mode based on launch date
export async function getAgentMode(): Promise<'flag' | 'autonomous'> {
  const { data } = await getSupabaseAdmin()
    .from('agent_runs')
    .select('started_at')
    .order('started_at', { ascending: true })
    .limit(1)

  if (!data || data.length === 0) return 'flag'

  const firstRun = new Date(data[0].started_at)
  const daysSinceFirst = (Date.now() - firstRun.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceFirst >= 7 ? 'autonomous' : 'flag'
}

// Determine cron schedule based on launch
export async function shouldRunToday(): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('agent_runs')
    .select('started_at')
    .order('started_at', { ascending: true })
    .limit(1)

  if (!data || data.length === 0) return true

  const firstRun = new Date(data[0].started_at)
  const daysSinceFirst = (Date.now() - firstRun.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceFirst < 7) return true

  const today = new Date().getDay()
  return today === 1 // Monday
}
