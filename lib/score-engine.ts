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
  buzzScore?: number
  tripadvisorText?: string
}

export async function computeScoresWithClaude(inputs: ScoreInputs): Promise<SyncResult> {
  const { name, city, googleRating, googleReviewCount, googleReviews, iensText } = inputs

  const reviewTexts = googleReviews.length > 0
    ? googleReviews.join('\n---\n')
    : 'Geen reviews beschikbaar.'

  const extraText = [iensText, inputs.tripadvisorText].filter(Boolean).join('\n\n')

  const buzzLine = inputs.buzzScore !== undefined
    ? `${inputs.buzzScore}`
    : 'calculated by you based on review sentiment'

  const buzzJsonField = inputs.buzzScore !== undefined
    ? `${inputs.buzzScore}`
    : '<int 0-100>'

  const prompt = `You are the EpicDimSum dumpling intelligence engine. Your job is NOT to give a general restaurant score — your job is to evaluate dim sum and dumpling quality specifically, using textual evidence from reviews.

Restaurant: ${name}, ${city}
Google rating: ${googleRating}/5 (${googleReviewCount} reviews)
Google reviews:
${reviewTexts}
Iens/other data: ${extraText || 'Not available.'}
Pre-calculated buzz score: ${buzzLine}/100

STEP 1 — Dumpling mention analysis:
Count how many reviews explicitly mention: ha gao, har gow, siu mai, cheung fun, char siu bao, dumplings, gestoomde hapjes, garnaalendumplings, velletjes, vulling, juicy, thin skin, vers, fresh.
Calculate: dumplingMentionRatio = mentions / totalReviews (as percentage 0-100)

STEP 2 — Quality signal extraction:
From dumpling-specific mentions only, extract:
- Positive signals: thin skin, juicy filling, fresh, handmade, authentic, perfectly steamed, delicate
- Negative signals: dry, thick skin, frozen, bland, tasteless, tough, overcooked

IMPORTANT DISTINCTIONS:
- "dumplingMentionScore": what % of reviews mention dumplings AT ALL (0-100)
- "dumplingQualityScore": of those mentions, how POSITIVE are they (0-100)
  - ignore generic praise like "great food", "nice place", "lekker"
  - ONLY count dumpling-specific quality signals
  - positive: "perfect velletjes", "sappige garnalen", "beste ha gao", "thin skin", "juicy", "vers", "handgemaakt"
  - negative: "droog", "dik vel", "diepvries", "smaakloos", "tough", "disappointing"
  - If dumplings are not mentioned at all → dumplingQualityScore = null (not scoreable)
- "dumplingScore": dumplingMentionScore * (dumplingQualityScore / 100) — the COMBINED signal
  - This is what goes into EpicScore, not mentionScore alone

STEP 3 — Small sample correction:
confidence = min(log10(${googleReviewCount} + 1) / 2.5, 1.0)
If confidence < 0.5, be honest about limited data but don't penalize quality signals.
A restaurant with 50 reviews all mentioning perfect ha gao BEATS a restaurant with 2000 generic reviews.

EpicScore formula:
  googleNormalized = (${googleRating} / 5) * 100
  base = (googleNormalized * 0.25) + (haGaoIndex/5*100 * 0.40) + (buzzScore * 0.20) + (vibeScore * 0.10)
  confidenceModifier = (confidence - 0.5) * 10
  epicScore = round(base + confidenceModifier)

Return ONLY valid JSON, no markdown, no preamble:
{
  "haGaoIndex": <float 0-5, based ONLY on dumpling-specific review signals, not general rating>,
  "dumplingMentionScore": <int 0-100, what % of reviews mention dumplings specifically>,
  "dumplingQualityScore": <int 0-100 or null if no mentions>,
  "dumplingScore": <int 0-100, combined: dumplingMentionScore * dumplingQualityScore/100>,
  "confidence": <float 0-1, min(log10(${googleReviewCount} + 1) / 2.5, 1.0)>,
  "haGaoDetail": "<one specific Dutch sentence about the dumpling quality — mention actual dishes if reviews do, e.g. 'De ha gao heeft dunne velletjes en sappige garnalen volgens meerdere reviews'>",
  "mustOrder": "<most mentioned specific dish in Dutch — be concrete, e.g. 'Ha gao met garnalen' not just 'dumplings'>",
  "vibeScore": <int 0-100, atmosphere based on non-dumpling review signals>,
  "buzzScore": ${buzzJsonField},
  "epicScore": <int 0-100, calculated as above>,
  "rankReason": "<one punchy Dutch sentence max 12 words explaining the rank — focus on dumpling quality, e.g. 'Sterkste ha gao feedback in Amsterdam, zelfs met weinig reviews'>",
  "summary": "<2 sentences max in Dutch, honest and specific about dumpling quality>"
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
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
    dumplingMentionScore: Number(parsed.dumplingMentionScore ?? 0),
    dumplingQualityScore: parsed.dumplingQualityScore === null ? null : Number(parsed.dumplingQualityScore ?? 0),
    dumplingScore: Number(parsed.dumplingScore ?? 0),
    confidence: Number(parsed.confidence ?? 0.5),
  }
}

export function weightedEpicScore(params: {
  googleScore: number
  haGaoScore: number
  buzzScore: number
  vibeScore: number
  confidence?: number
}): number {
  const { googleScore, haGaoScore, buzzScore, vibeScore, confidence = 0.5 } = params
  const base = googleScore * 0.25 + haGaoScore * 0.40 + buzzScore * 0.20 + vibeScore * 0.10
  const modifier = (confidence - 0.5) * 10
  return Math.round(base + modifier)
}
