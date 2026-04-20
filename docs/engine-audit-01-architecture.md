# Dumpling Intelligence Engine, Architectuur

*20 april 2026 — fase 1 audit, alleen architectuur*

## 1. Engine-bestanden

### Kern (lib/)
- `lib/score-engine.ts` — Claude scoring (Haiku 4.5), de hersenen van de engine
- `lib/google-places.ts` — Google Places v1 API client + score normalisatie
- `lib/iens-scraper.ts` — Iens.nl review scraping
- `lib/tripadvisor-scraper.ts` — Tripadvisor review scraping
- `lib/web-search.ts` — algemene web mentions search
- `lib/buzz-engine.ts` — RSS-feeds (5 NL foodblogs) + TikTok HTML signaal
- `lib/discovery.ts` — nieuwe restaurants vinden via Places searchText
- `lib/quality-agent.ts` — kwaliteitsagent (verificatie / cleanup)
- `lib/db.ts` — Supabase upsert/get helpers
- `lib/supabase.ts` — Supabase client
- `lib/types.ts` — `Restaurant`, `SyncResult`, score-velden schema

### API-routes (app/api/)
- `app/api/sync/[id]/route.ts` — **orchestrator** voor één restaurant (Google → scrapers → buzz → Claude → upsert)
- `app/api/cron/sync-all/route.ts` — batch-sync alle restaurants (Vercel cron)
- `app/api/cron/discover/route.ts` — periodieke discovery van nieuwe spots
- `app/api/admin/full-scan/route.ts` — admin: discovery + stub-create
- `app/api/admin/verify-all/route.ts` — admin: verify pass over alle restaurants
- `app/api/admin/cleanup/route.ts` — admin: opruimen
- `app/api/admin/add-restaurant/route.ts` — admin: handmatige toevoeging
- `app/api/suggest/route.ts` — user-facing suggesties (rate-limited)
- `app/api/agent/audit/route.ts` — autonome flagging-agent (geen scoring)

## 2. Data flow

### Sync van één restaurant (`app/api/sync/[id]/route.ts`)

```
POST /api/sync/[id]
  ├─ auth: x-sync-secret header                         (route.ts:29-33)
  ├─ getRestaurantById(id)                              (route.ts:35)
  ├─ fetchGooglePlacesData(googlePlaceId)               (route.ts:52)
  │   → rating, userRatingCount, reviews[5], photos[3]
  ├─ normalizeGoogleScore(rating, reviewCount)          (route.ts:57)
  ├─ fetchIensData(name, city)         [try/catch]      (route.ts:63)
  │   → reviewTexts[], reviewCount
  ├─ fetchTripadvisorData(name, city)  [silent fail]    (route.ts:72)
  ├─ searchWebMentions(name, city)     [silent fail]    (route.ts:78)
  ├─ computeBuzzScore(name, city, blogMentions, gReviewCount)  (route.ts:83)
  │   ├─ 5x fetchRssFeed (parallel)                     (buzz-engine.ts:91)
  │   └─ fetchTikTokMentions                            (buzz-engine.ts:96)
  ├─ computeScoresWithClaude({...all reviews, buzz})    (route.ts:90)
  │   → Anthropic API (claude-haiku-4-5-20251001)       (score-engine.ts:118)
  │   → JSON: haGaoIndex, dumpling{Mention,Quality,Score},
  │           confidence, vibeScore, buzzScore, epicScore,
  │           mustOrder, summary, haGaoDetail, rankReason
  ├─ epicScoreFallback() als scores.epicScore == 0      (route.ts:102, route.ts:14)
  ├─ verified = epicScore > 20 && haGaoIndex > 0        (route.ts:106)
  └─ upsertRestaurant(updated)                          (route.ts:138)
```

**Failure modes:**
- Google Places: catch → behoud bestaande sources (route.ts:53). Restaurant blijft op oude rating staan.
- Iens: catch → leeg + behoud blogMentions (route.ts:67).
- Tripadvisor: silent fail, leeg array (route.ts:74).
- Web search: silent fail, leeg array (route.ts:80).
- Claude: throw (route.ts:144 → 500). Hele sync rolt terug (geen upsert).
- Claude epicScore=0: gedekt door fallback formule.

## 3. Externe services

| Service | Doel | Bestand | Auth |
|---|---|---|---|
| Google Places API v1 | rating, reviews (5), photos (3) | `lib/google-places.ts:31` | `GOOGLE_PLACES_API_KEY` (server) |
| Google Places, public | photo media URLs | `lib/google-places.ts:13` | `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` |
| Anthropic API | scoring + analyse | `lib/score-engine.ts:4,118` | `ANTHROPIC_API_KEY` (SDK default) |
| Iens.nl | review scraping | `lib/iens-scraper.ts` | geen, HTML scrape |
| Tripadvisor | review scraping | `lib/tripadvisor-scraper.ts` | geen, HTML scrape |
| Web search | mentions | `lib/web-search.ts` | te bevestigen (Brave/Tavily?) |
| TikTok | videoCount signaal | `lib/buzz-engine.ts:46` | geen, HTML scrape |
| 5x NL foodblog RSS | blogMentions | `lib/buzz-engine.ts:14-20` | geen |
| Supabase | persistence | `lib/db.ts`, `lib/supabase.ts` | service role / anon |

RSS feeds in scope: missfoodie.nl, foodlog.nl, eatlife.nl, foodinista.nl, leukerecepten.nl.

Claude model: **`claude-haiku-4-5-20251001`** (`lib/score-engine.ts:118`), max_tokens 2000, single-turn user message met JSON-only respons.

## 4. Scoring componenten

### Google score, `lib/google-places.ts:92-98`
```
ratingScore = (rating / 5) * 100
countBoost  = min(reviewCount / 2000, 1) * 10
googleScore = min(round(ratingScore + countBoost), 100)
```
Pure deterministische berekening, geen Claude.

### Buzz score, `lib/buzz-engine.ts:76-83`
```
blogScore   = min(blogMentions * 15, 45)
tiktokScore = tiktokSignal ? 20 : 0
volumeScore = min(round(log10(reviewCount + 1) * 17), 35)
buzz        = max(min(round(blogScore + tiktokScore + volumeScore), 100), 15)
```
Floor van 15 ("never show below 15, 1 looks like a bug"). Deterministisch.

### Ha Gao Index, `lib/score-engine.ts:103`
Door Claude geretourneerd, **0-5 float**, alleen op basis van dumpling-specifieke review-signalen.
Gemapt naar 0-100 in `app/api/sync/[id]/route.ts:126`: `round((haGaoIndex / 5) * 100)`.

### Vibe score, `lib/score-engine.ts:110`
Door Claude, 0-100, op basis van non-dumpling sfeer-signalen. Default 50 als parse mist (`score-engine.ts:142`).

### EpicScore, `lib/score-engine.ts:95-99` (door Claude berekend)
```
googleNormalized   = (googleRating / 5) * 100
base               = googleNormalized*0.25 + (haGaoIndex/5*100)*0.40
                   + buzzScore*0.20       + vibeScore*0.10
confidenceModifier = (confidence - 0.5) * 10
epicScore          = round(base + confidenceModifier)
```
**Gewichten:** ha gao 40%, google 25%, buzz 20%, vibe 10%. Confidence kan ±5 punten verschuiven.

### EpicScore fallback, `app/api/sync/[id]/route.ts:14-22`
```
fallback = max(round((rating/5)*60 + min(log10(reviewCount+1)/3*20, 20)), 30)
```
Alleen gebruikt als Claude `epicScore = 0` retourneert (`route.ts:102`).

### Dumpling-scores, `lib/score-engine.ts:81-88,106`
- `dumplingMentionScore` (0-100): % reviews dat dumplings noemt.
- `dumplingQualityScore` (0-100 of `null`): kwaliteitssentiment van die mentions; null als geen mentions.
- `dumplingScore` (0-100): `mentionScore * qualityScore / 100`.

### Confidence, `lib/score-engine.ts:91,107`
```
confidence = min(log10(googleReviewCount + 1) / 2.5, 1.0)
```
Gebruikt in epicScore-modifier en als kalibratie voor de prompt.

### Verified flag, `app/api/sync/[id]/route.ts:106`
```
verified = epicScore > 20 && haGaoIndex > 0
```

## 5. Wat ik nog niet heb bevestigd

Voor een volledig audit-rapport moet fase 2 nog:
- `lib/iens-scraper.ts`, `lib/tripadvisor-scraper.ts`, `lib/web-search.ts` — exacte selectors/endpoints, brittleness van HTML parsing.
- `lib/discovery.ts` — discovery-criteria (welke queries, welke filters).
- `lib/quality-agent.ts` — wat doet deze, wanneer wordt hij aangeroepen.
- `app/api/agent/audit/route.ts` — flag-logica (gebruikt deze Claude? welke prompt?).
- `app/api/cron/sync-all/route.ts` — batch-strategie, rate limiting, parallellisme.
- `lib/db.ts` / Supabase schema — welke kolommen, indexes, en hoe `verified=false` doorwerkt in de feed-query.
- Casus Meet Noodles Amsterdam — concrete data uit `data/restaurants.json` of Supabase.
- Prompt deep-dive (alle subtiele zwaktes in `score-engine.ts:62-115`).
- Optimalisatie-voorstellen (gewichten, recency-decay, single-source bias, scraper-resilience).

Volgende fase: lees de vier scraper/agent-bestanden en de Meet Noodles seed-data, plan optimalisaties.
