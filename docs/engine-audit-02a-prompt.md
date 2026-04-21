# Engine audit 02a — De Claude prompt

*20 april 2026. Bron: `lib/score-engine.ts:62-115`.*

## 1. De volledige prompt (letterlijk)

```
You are the EpicDimSum dumpling intelligence engine. Your job is NOT to give a general restaurant score — your job is to evaluate dim sum and dumpling quality specifically, using textual evidence from reviews.

Restaurant: ${name}, ${city}
Google rating: ${googleRating}/5 (${googleReviewCount} reviews)
Review sources (${totalReviews} total across all platforms):
${reviewBlock}

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
  "haGaoDetail": "<one specific Dutch sentence about the dumpling quality — mention actual dishes if reviews do>",
  "mustOrder": "<most mentioned specific dish in Dutch — be concrete, e.g. 'Ha gao met garnalen' not just 'dumplings'>",
  "vibeScore": <int 0-100, atmosphere based on non-dumpling review signals>,
  "buzzScore": ${buzzJsonField},
  "epicScore": <int 0-100, calculated as above>,
  "rankReason": "<max 10 words Dutch — be direct about WHY this ranks here. If haGaoIndex is low despite good Google score, say: 'Goed restaurant maar weinig dim sum-bewijs'. If haGaoIndex is high, say what makes the dumplings good. Never be vague. Examples: 'Consistente ha gao kwaliteit door de jaren heen' / 'Hoge buzz maar dumplingkwaliteit wisselvallig' / 'Goed restaurant, geen echte dim sum-specialist'>",
  "summary": "<2 sentences max in Dutch, honest and specific about dumpling quality>"
}
```

**Model:** `claude-haiku-4-5-20251001` (`score-engine.ts:118`)
**max_tokens:** 2000
**Single-turn user message, geen system prompt, geen tools.**

## 2. Verwachte JSON output

```json
{
  "haGaoIndex":            "float 0-5",
  "dumplingMentionScore":  "int 0-100",
  "dumplingQualityScore":  "int 0-100 | null",
  "dumplingScore":         "int 0-100",
  "confidence":            "float 0-1",
  "haGaoDetail":           "string (Dutch, 1 sentence)",
  "mustOrder":             "string (Dutch, specifiek gerecht)",
  "vibeScore":             "int 0-100",
  "buzzScore":             "int 0-100 (meestal pass-through)",
  "epicScore":             "int 0-100",
  "rankReason":            "string (Dutch, max 10 woorden)",
  "summary":               "string (Dutch, max 2 zinnen)"
}
```

Parsing: `text.replace(/```json\n?|\n?```/g, '').trim()` → `JSON.parse` (`score-engine.ts:128-133`). Bij failure: throw `Claude returned invalid JSON` (`score-engine.ts:136`).
Defaults bij missende velden (`score-engine.ts:140-157`):
- `haGaoIndex` → 0
- `vibeScore` → 50
- `buzzScore` → 50
- `epicScore` → 0 (wordt daarna vervangen door fallback in sync route)
- `mustOrder`, `summary`, `haGaoDetail`, `rankReason` → lege string
- `dumplingQualityScore === null` wordt behouden als null, anders Number of undefined

## 3. Inputs naar de prompt

Uit `ScoreInputs` interface (`score-engine.ts:6-16`):

| Variabele in prompt | Bron | Noot |
|---|---|---|
| `${name}` | `restaurant.name` (sync route) | — |
| `${city}` | `restaurant.city` | — |
| `${googleRating}` | `googleData.rating` (0-5 float) | 0 bij Places-fail |
| `${googleReviewCount}` | `googleData.userRatingCount` | 0 bij Places-fail |
| `${totalReviews}` | `googleReviewCount + iens.length + tripadvisor.length + webMentions.length` (`score-engine.ts:46-50`) | **Apples-to-oranges**: Google is count van alle reviews, andere zijn lengte van de reviewTexts array (max ~8) |
| `${reviewBlock}` | `combineReviews()` (`score-engine.ts:23-41`) | Max 4000 chars, split per bron met `---` separator. Google 5, Iens 5, TA 5, web 6. |
| `${buzzLine}` | `buzzScore` uit `computeBuzzScore` of `'calculated by you based on review sentiment'` | — |
| `${buzzJsonField}` | `${buzzScore}` of placeholder `<int 0-100>` | Bepaalt of Claude de buzz mag overschrijven |

## 4. Drie zwakke plekken in de prompt

1. **`totalReviews` is een gebroken getal.** Google draagt `userRatingCount` (vaak 500-2000) bij, maar Iens/TA/web dragen alleen de lengte van hun sample-array bij (max 5-6 items). Hierdoor wordt `dumplingMentionRatio = mentions / totalReviews` structureel verkeerd berekend — de noemer bevat reviews die Claude nooit zag, plus een handvol die hij wél zag.

2. **Geen recency-signaal.** De prompt vraagt nergens naar datum van reviews. Een 2019-klacht over "droog vel" weegt even zwaar als een 2026-review over "perfect vers". Geen decay, geen recency-gewicht, geen filter.

3. **JSON-contract is intern inconsistent.** Claude moet `epicScore` zelf uitrekenen, maar de prompt geeft hem de formule **en** pre-berekende `buzzScore`, **en** laat hem tegelijk `haGaoIndex` en `vibeScore` schatten die in die formule zitten. Drift tussen Claude's rekenwerk en wat de code achteraf zou krijgen als ze het deterministisch hadden berekend — nu gebeurt het nergens gecheckt. Ook: `dumplingScore = mentionScore * qualityScore/100` staat twee keer gedefinieerd (stap 2 én JSON-schema), terwijl `qualityScore` `null` kan zijn — onduidelijk wat dan met `dumplingScore` gebeurt.
