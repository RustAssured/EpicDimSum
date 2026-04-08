import Anthropic from '@anthropic-ai/sdk'
import { SyncResult } from './types'

const client = new Anthropic()

interface ScoreInputs {
  name: string
  city: string
  googleRating: number
  googleReviewCount: number
  googleReviews: string[]
  iensText: string
}

export async function computeScoresWithClaude(inputs: ScoreInputs): Promise<SyncResult> {
  const { name, city, googleRating, googleReviewCount, googleReviews, iensText } = inputs

  const reviewTexts = googleReviews.length > 0
    ? googleReviews.join('\n---\n')
    : 'Geen reviews beschikbaar.'

  const prompt = `You are the EpicDimSum scoring engine. Analyze the following data about a Dim Sum restaurant in the Netherlands and return ONLY valid JSON with no preamble.

Restaurant: ${name}, ${city}

Google rating: ${googleRating}/5 (${googleReviewCount} reviews)
Google reviews sample:
${reviewTexts}

Iens data: ${iensText || 'Niet beschikbaar.'}

Return this exact JSON structure:
{
  "haGaoIndex": <float 0-5, weighted average of Ha Gao quality (60%) and Siu Mai quality (40%) based on review mentions — the two signature tests of any dim sum kitchen>,
  "haGaoDetail": "<one line in Dutch explaining what specifically makes their dumplings good or bad — be specific about texture, filling, freshness>",
  "rankReason": "<one punchy Dutch sentence explaining why this restaurant ranks where it does — e.g. 'Exploderende buzz maar wisselvallige vibe houdt de score laag' or 'Consistente topkwaliteit op alle fronten, verdiende nummer 1'>",
  "mustOrder": "<one punchy sentence in Dutch about the single best dish to order>",
  "vibeScore": <int 0-100, atmosphere and experience quality>,
  "buzzScore": <int 0-100, based on volume and positivity of all sources>,
  "epicScore": <int 0-100, weighted: google 35% + haGao 25% + buzz 25% + vibe 15%>,
  "summary": "<2 sentence max summary in Dutch of why this place is or isn't worth it>"
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const text = content.text.trim()
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    haGaoIndex: Number(parsed.haGaoIndex),
    haGaoDetail: String(parsed.haGaoDetail ?? ''),
    rankReason: String(parsed.rankReason ?? ''),
    mustOrder: String(parsed.mustOrder),
    vibeScore: Number(parsed.vibeScore),
    buzzScore: Number(parsed.buzzScore),
    epicScore: Number(parsed.epicScore),
    summary: String(parsed.summary),
  }
}

export function weightedEpicScore(params: {
  googleScore: number
  haGaoScore: number
  buzzScore: number
  vibeScore: number
}): number {
  const { googleScore, haGaoScore, buzzScore, vibeScore } = params
  return Math.round(
    googleScore * 0.35 +
    haGaoScore * 0.25 +
    buzzScore * 0.25 +
    vibeScore * 0.15
  )
}
