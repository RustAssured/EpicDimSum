# Engine audit 05 — Scraper-fragiliteit

*20 april 2026. Bronnen: `lib/iens-scraper.ts`, `lib/tripadvisor-scraper.ts`, `lib/web-search.ts`, `lib/buzz-engine.ts`.*

---

## Iens (`lib/iens-scraper.ts`)

**Yield (aanname uit code):** maximaal 8 review-teksten (JSON-LD pad, regel 90) of 10 (HTML-fallback, regel 105). Realistisch minder: de `reviewBody.length > 20` filter (regel 92) en dedup (regel 107) drukken dit omlaag. Bovendien: Iens' search-pagina geeft geen directe restaurant-link als het restaurant niet geïndexeerd is, dan valt het terug op `rawText` (regel 38-46) en `reviewTexts = []`.

**Selectors (zeer brittle):**
- `href="(\/restaurant\/[^"?#]+)"` (regel 34) — één regex-match op de héle search-HTML. Geen validatie dat het het juiste restaurant is.
- `(?:score|rating|cijfer)[^>]*>[\s]*([0-9][,\.][0-9])` (regel 67) — kan elk getal tussen 0,0 en 9,9 pakken dat ergens na het woord "score" staat. Valse matches realistisch.
- `(\d+)\s*(?:reviews?|beoordelingen?)` (regel 71) — pakt het eerste getal op de pagina gevolgd door "reviews". Kan net zo goed "5 reviews" van een gerelateerde sectie zijn.
- JSON-LD parse (regel 77-97) — robuuster, maar afhankelijk van of Iens JSON-LD publiceert.
- HTML fallback: `class="[^"]*(?:review|comment|text|body)[^"]*"` (regel 103) — matcht op alles met "text" of "body" in class. Grootste bron van false positives.

**0 resultaten vs fout:** niet onderscheiden. Alle paden geven `{ rating:null, reviewCount:null, rawText:'', reviewTexts:[] }` terug (regel 12 empty template). Top-level `catch` op regel 120 slikt elke error geluidloos. De sync-route logt wél een fout (`[Sync] Iens fetch failed`) — maar dat is alleen voor de top-level exception, niet voor een lege-maar-succesvolle response.

**Silent-fail impact:** `iensReviews = []` → `combineReviews` slaat het Iens-blok over (regel 29-31 van score-engine) → reviewBlock kleiner → Claude heeft minder context. Maar `totalReviews` blijft `googleReviewCount + 0 + tripadvisor.length + web.length` (zie noemer-analyse onderaan).

---

## Tripadvisor (`lib/tripadvisor-scraper.ts`)

**Yield (aanname uit code):** maximaal 10 review-teksten via JSON-LD (regel 98), of 8 via `data-test-target="review-body"` fallback (regel 110), of 8 via generic paragraph fallback (regel 120). Realistisch: **Tripadvisor is berucht om aggressieve anti-bot measures**. De mobiele User-Agent (Android Pixel 7, regel 10) probeert dit te omzeilen maar wordt vaak geblokkeerd met een 200-status-code + captcha-pagina — die parset als "geen resultaten" maar zonder fout.

**Selectors:**
- `href="(\/Restaurant_Review-[^"]+\.html)"` (regel 45) — één regex op search HTML.
- `"ratingValue"\s*:\s*"?(\d+\.?\d*)"?` (regel 80) — JSON-LD ratingValue.
- `"reviewCount"\s*:\s*"?(\d+)"?` (regel 83) — JSON-LD reviewCount.
- `data-test-target="review-body"[^>]*>([\s\S]{20,600}?)<\/span>` (regel 109) — redelijk specifieke selector, kan ieder moment hernoemd worden door TA.
- `class="[^"]*(?:review|partial_entry|entry)[^"]*"` (regel 119) — zelfde breedte-probleem als Iens fallback.

`geo=188640` (regel 29) is Nederland — correct.

**0 resultaten vs fout:** niet onderscheiden. Empty template (regel 18-24) met `dumplingMentions: 0` als default. Top-level catch op regel 140. Geen logging in de scraper zelf — de sync-route `try { ... } catch { /* silent fail */ }` (route.ts:74) gooit zelfs het errorobject weg.

**Silent-fail impact:** `tripadvisorReviews = []`, `dumplingMentions` verloren (niet eens gebruikt downstream!), TA-blok weg uit reviewBlock. Zelfde noemer-artefact als Iens: `totalReviews` wordt wel verhoogd als TA iets levert, niet als hij niets levert.

Let op: **Tripadvisor's `dumplingMentions` wordt nergens meegegeven aan Claude.** De scraper telt ze wel (regel 134-137), maar `fetchTripadvisorData` retourneert het veld en de sync-route gebruikt alleen `reviewTexts`. Dood signaal.

---

## Web search (`lib/web-search.ts`)

**Yield (aanname uit code):** maximaal 8 mentions (regel 41 `.slice(0, 8)`). Gebruikt Claude Haiku 4.5 met de `web_search` tool (max_uses: 2, regel 18) in een 4-turn agentic loop (regel 23). Realistisch: bij een bekend restaurant met NL web-aanwezigheid levert dit vaak 3-6 snippets; bij obscure spots 0.

**Selectors:** geen HTML-selectors — Claude doet de extraction. Wel regex op de JSON-response: `cleaned.match(/\{[\s\S]*\}/)` (regel 35) — pakt de eerste `{...}` blok in de text. Faalt als Claude antwoordt met meerdere JSON-blokken of met text-eromheen.

**0 resultaten vs fout:** beide paden leiden tot `{ mentions: [], totalFound: 0 }`:
- `stop_reason === 'end_turn'` zonder parsebare JSON → lege return (regel 46).
- `tool_use` zonder concrete tool results (regel 53 geeft `content: ''`!) → Claude moet blind raden na tool-call — dat is een **echte bug**: de tool-result is leeg ongeacht wat de web_search teruggaf. De agentic loop draait dus effectief alsof de tool geen data terugkreeg.
- Exception → catch, logger draait, lege return.

**Silent-fail impact:** `webMentions = []`. Kost wel altijd API-tokens, ook bij failure — duur zonder opbrengst.

De lege-tool-result bug (regel 53) is de belangrijkste vondst: `content: ''` betekent dat de web_search tool-call nooit het resultaat terugvoedt naar Claude. De hele agentic flow is structureel gebroken.

---

## Buzz engine (`lib/buzz-engine.ts`)

**Yield (aanname uit code):**
- RSS: 5 NL foodblog feeds, sequentieel geparallelliseerd (regel 91-93). Per feed: `<item>...</item>` regex + case-insensitive `.includes(name)` op het item. Voor een **obscuur restaurant is 0 matches op alle 5 de feeds het verwachte resultaat**. Alleen écht bekende restaurants halen hier überhaupt iets uit.
- TikTok: `fetchTikTokMentions` (regel 46) — HTML scrape van `https://www.tiktok.com/search?q=...`. Extreem brittle.

**Selectors:**
- RSS items: `<item>([\s\S]*?)<\/item>` (regel 34) — standaard RSS, robuust.
- Name matching: `match[1].toLowerCase().includes(name.toLowerCase())` (regel 38-39). Full-string include: "Meet Noodles" matcht niet op "Meet-Noodles" of "MeetNoodles" of "Meet Noodles Amsterdam" als het feed-item alleen "Meet Noodles Eindhoven" bevat (overigens: matcht dan wél, want includes). Wel gevoelig voor naamvariaties.
- TikTok videoCount: `"videoCount"\s*:\s*(\d+)` (regel 65) — hoopt dat TikTok die key nog in hun hydratie-state heeft. Fallback: tel naam-occurrences in HTML, capped op 50 (regel 68-70). Beide zeer brittle.

**0 resultaten vs fout:**
- RSS per feed: timeout (6000ms) of `!res.ok` → return 0. Exception → return 0. **Niet te onderscheiden van "feed bestaat en heeft 0 items met deze naam".**
- TikTok: timeout (8000ms) of `!res.ok` → return 0. Exception → return 0.

**De floor van 15:** `Math.max(raw, 15)` op regel 82. Kritiek punt: een restaurant met 0 blog mentions, 0 TikTok, 0 Google reviews krijgt toch buzzScore 15. In de epicScore-formule (20% gewicht): `15 * 0.20 = 3.0` punten gratis. Een volledig onbekend restaurant krijgt dus automatisch 3 epicScore-punten uit thin air.

**Silent-fail impact:**
- RSS-failure bij alle 5 feeds → `blogMentions = existingBlogMentions` (0 voor nieuwe spots). Dan `blogScore = 0`.
- TikTok-failure → `tiktokSignal = false`, `tiktokScore = 0`.
- Dan bestaat buzz alleen uit `volumeScore` (gebaseerd op Google review count), met floor 15.
- Dit betekent: **als alle scrapers falen, wordt buzz effectief een proxy voor Google review count.** De "buzz" pijler meet dan geen buzz meer, maar simpelweg log van het Google volume. Redundant met de google pillar.

---

## Noemer-fix analyse: wat als scrapers structureel weinig opleveren?

De bug uit audit 02a: `totalReviews = googleReviewCount + iens.length + ta.length + web.length` (score-engine.ts:46-50). De noemer is kapot omdat `googleReviewCount` het totaal is (bijv. 2847) terwijl de andere alleen de lengte van hun review-text array zijn (max 5-10).

**Wat als scrapers 0 teruggeven** (realistisch scenario voor 80%+ van restaurants):
- `totalReviews ≈ googleReviewCount` (bijv. 2847)
- Claude ziet in `reviewBlock` alleen de 5 Google reviews die Places teruggaf
- Claude telt dumpling-mentions in max 5 texten, deelt door 2847
- **Resultaat: `dumplingMentionScore` is altijd bizar laag** (max 5/2847 = 0.18%, maar Claude moet er een 0-100 integer van maken — waarschijnlijk rondt hij af naar iets tussen 5-30 op gevoel).

**Wat als scrapers goed werken** (rare case):
- `totalReviews ≈ 2847 + 8 + 10 + 8 = 2873`
- Claude ziet ~31 review-teksten in reviewBlock
- Mentions in 31 teksten / 2873 totaal = nog steeds <1%, maar nu zijn er wél meer data-punten

**Conclusie:** de noemer-bug is **in beide gevallen kapot**, maar bij falende scrapers is hij extra slopend omdat de noemer alleen uit Google bestaat terwijl de teller uit 5 Google reviews komt. Bij werkende scrapers is de ratio nog steeds absurd laag, maar Claude heeft tenminste meer materiaal om een intuïtieve schatting te maken — die vervolgens arbitrair wordt. Met andere woorden: scrapers verbeteren de kwaliteit van Claude's input, maar repareren de gebroken wiskunde niet. Het is een fix die je pas écht ziet als je de noemer op `reviewBlock.length` zet in plaats van `googleReviewCount`.
