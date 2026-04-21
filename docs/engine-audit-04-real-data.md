# Engine audit 04 — Echte data

*20 april 2026. Databron: `data/restaurants.json` (10 seed restaurants, gesorteerd op epicScore DESC). Supabase is niet bereikbaar vanuit deze omgeving (geen .env bestanden aanwezig), dus live DB-data is niet beschikbaar.*

---

## Top 10 restaurants (alle beschikbare data)

| name | city | googleRating | googleReviewCount | haGaoIndex | dumplingMentionScore | dumplingQualityScore | buzzScore | vibeScore | epicScore | confidence | verified |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Dim Sum House | Rotterdam | 4.3 | 892 | 4.6 | 61 | 91 | 87 | 89 | 88 | 0.90 | null |
| Oriental City | Amsterdam | 4.2 | 2847 | 4.5 | 34 | 82 | 88 | 82 | 87 | 0.97 | null |
| Full Moon City | Den Haag | 4.1 | 1102 | 4.3 | 41 | 79 | 81 | 85 | 84 | 0.88 | null |
| Treasure | Amsterdam | 4.0 | 1456 | 4.1 | 29 | 75 | 83 | 76 | 82 | 0.94 | null |
| East Palace | Rotterdam | 4.0 | 1234 | 4.0 | 33 | 73 | 78 | 81 | 80 | 0.93 | null |
| Kuan Yin | Den Haag | 3.9 | 687 | 3.9 | 38 | 71 | 77 | 83 | 79 | 0.87 | null |
| Sea Palace | Amsterdam | 3.8 | 1923 | 3.8 | 22 | 61 | 80 | 74 | 78 | 0.95 | null |
| New China | Den Haag | 3.6 | 543 | 3.6 | 19 | 58 | 76 | 70 | 74 | 0.83 | null |
| Pacifica | Utrecht | 4.1 | 287 | 3.6 | 28 | 62 | 65 | 80 | 74 | 0.72 | null |
| China Garden | Eindhoven | 4.0 | 143 | 3.4 | 41 | 68 | 58 | 76 | 71 | 0.55 | null |

---

## Observaties

### Spreiding haGaoIndex
- Min: 3.4 (China Garden)
- Max: 4.6 (Dim Sum House)
- Mediaan: 3.95 (tussen East Palace 4.0 en Kuan Yin 3.9)
- Range is smal: 1.2 punten over het hele veld. Bijna alle restaurants zitten in de 3.4-4.6 band.

### dumplingMentionScore < 15
- **0 restaurants** hebben dumplingMentionScore < 15.
- Laagste: Sea Palace (22) en New China (19).
- Alle seed restaurants scoren minimaal 19 — wat opvallend hoog is voor een breed publiek. Suggereert dat de seed-set is samengesteld uit bekende dim sum-specialisten, niet uit het brede restaurant-universum waar de engine ook op draait.

### buzzScore = 15 (de floor)
- **0 restaurants** hebben buzzScore = 15.
- Laagste: China Garden (58). Alle seed restaurants zitten boven de 58.
- De buzz-floor van 15 is dus nog niet zichtbaar in deze data — die floor is relevant voor nieuw-ontdekte of obscure restaurants (via suggest/full-scan), niet voor de gevestigde orde in de seed-set.

### Verdacht hoge rankings

**1. Pacifica (Utrecht, epicScore 74)**
- googleRating 4.1 met slechts 287 reviews. Confidence 0.72 — de laagste van alle tien.
- haGaoIndex 3.6 bij lage reviewvolume: kleine kans dat dit op voldoende dumpling-specifiek bewijsmateriaal is gebaseerd.
- epicScore 74 is gelijk aan New China (543 reviews, Den Haag) — twee restaurants die moeilijk vergelijkbaar zijn, worden door de engine gelijkgesteld.

**2. China Garden (Eindhoven, epicScore 71)**
- Slechts 143 Google reviews — laagste van de set.
- confidence 0.55: de enige onder de 0.7 drempel.
- dumplingMentionScore 41 bij maar 143 reviews: dat zijn ~59 reviews met dumplingmention — aannemelijk, maar bij zo'n klein sample is één enthousiasteling met 3 reviews al goed voor 2% van de score.
- buzzScore 58 is ook de laagste — maar toch ver boven de floor van 15.

**3. Sea Palace (Amsterdam, epicScore 78)**
- Hoogste reviewvolume (1923) maar laagste haGaoIndex (3.8) en laagste dumplingMentionScore (22) van de top 7.
- De hoge confidence (0.95) en hoge buzz (80) stuwen de score omhoog, ook al is het dumpling-bewijs relatief dun.
- verified = null (net als alle anderen — opvallend, zie hieronder).

### Bijkomende observatie: verified = null voor alle 10

Geen enkel seed restaurant heeft `verified: true` of `verified: false` — het veld staat op `null`. In de sync-route wordt `verified = epicScore > 20 && haGaoIndex > 0` gezet (`app/api/sync/[id]/route.ts:106`), maar dat wordt alleen tijdens een sync-run geschreven. De seed data is kennelijk nooit door de sync-pipeline gegaan — de scores zijn handmatig ingevoerd. Dit betekent dat de seed data niet representatief is voor wat de engine in productie produceert.
