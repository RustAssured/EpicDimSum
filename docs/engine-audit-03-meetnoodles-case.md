# Engine audit 03 — Casus Meet Noodles Amsterdam

*20 april 2026. Databron: niet aanwezig in `data/restaurants.json` (10 seed restaurants, geen van hen "Meet Noodles"). Casus is een gereconstrueerde analyse op basis van publiek bekende feiten over dit restaurant en de audit-bevindingen uit fasen 1 en 2.*

---

## 1. Meet Noodles ruwe data

**Status:** niet in seed data. De 10 seed restaurants zijn allemaal gevestigde Amsterdamse dim sum-klanten (Oriental City, Sea Palace, Treasure, Full Moon City, etc.). Meet Noodles is primair een noedelrestaurant — dat is precies wat deze casus interessant maakt.

**Publiek bekend (Google Maps, april 2026):**
- Google rating: ~4.1/5
- Google reviewCount: ~600-900 reviews
- Cuisine: Aziatisch / noedels / ook dim sum op menu

**Hypothetische engine-output** (op basis van hoe de pipeline zou reageren op dit restaurant):

| Veld | Geschatte waarde | Toelichting |
|---|---|---|
| `googleRating` | 4.1 | Gezonde Google-score |
| `googleReviewCount` | ~700 | Redelijk volume |
| `haGaoIndex` | 1.5 – 2.5 | Weinig dumpling-specifieke signalen verwacht |
| `dumplingMentionScore` | 5 – 15 | Overgrote meerderheid reviews gaat over noedels |
| `dumplingQualityScore` | 40 – 60 of `null` | Te weinig materiaal voor betrouwbaar signaal |
| `dumplingScore` | < 10 | mentionScore × qualityScore/100 → laag |
| `buzzScore` | 15 – 25 | Geen NL foodblog-vermeldingen verwacht; floor van 15 |
| `vibeScore` | 60 – 75 | Veel positieve sfeer-reviews over bediening en prijs |
| `confidence` | ~0.74 | `log10(701) / 2.5 ≈ 0.74` |
| `epicScore` | 55 – 65 | Zie reconstructie hieronder |
| `verified` | waarschijnlijk `true` | epicScore > 20 && haGaoIndex > 0 |

---

## 2. Score reconstruction (worst-case: engine overschat)

Stel: haGaoIndex = 2.0, buzzScore = 20, vibeScore = 70, confidence = 0.74.

```
googleNormalized   = (4.1 / 5) * 100 = 82.0
haGao bijdrage     = (2.0 / 5 * 100) * 0.40 = 40 * 0.40 = 16.0
google bijdrage    = 82.0 * 0.25             = 20.5
buzz bijdrage      = 20 * 0.20               = 4.0
vibe bijdrage      = 70 * 0.10               = 7.0
base               = 16.0 + 20.5 + 4.0 + 7.0 = 47.5
confidenceModifier = (0.74 - 0.5) * 10       = 2.4
epicScore          = round(47.5 + 2.4)        = 50
```

Best-case (haGaoIndex = 2.5, vibeScore = 75, buzzScore = 25):

```
haGao bijdrage     = (2.5/5*100) * 0.40 = 50 * 0.40 = 20.0
google bijdrage    = 82.0 * 0.25        = 20.5
buzz bijdrage      = 25 * 0.20          = 5.0
vibe bijdrage      = 75 * 0.10          = 7.5
base               = 53.0
confidenceModifier = 2.4
epicScore          = round(55.4)        = 55
```

Conclusie: zuivere engine-output zou 50-55 geven. **Maar er is een probleem:**

### Hoe de engine toch te hoog kan scoren

**Scenario: haGaoIndex = 3.5 door prompt-bias.** Als ~60% van de Google-reviews voor Meet Noodles positief zijn ("heerlijk gegeten", "goede sfeer", "aanrader"), interpreteert Claude dit mogelijk als dumpling-kwaliteitssignaal — want de prompt vraagt Claude om "thin skin, juicy, fresh" te zoeken, maar beschermt niet expliciet tegen **restaurant-brede tevredenheid die als dumpling-kwaliteit wordt misgelezen**.

Met haGaoIndex = 3.5:
```
haGao bijdrage     = (3.5/5*100) * 0.40 = 70 * 0.40 = 28.0
google bijdrage    = 20.5
buzz bijdrage      = 4.0
vibe bijdrage      = 7.0
base               = 59.5
confidenceModifier = 2.4
epicScore          = round(61.9)        = 62
```

62 is "bovengemiddeld" in de EpicDimSum-context — terwijl het restaurant in de praktijk "vrij matig" scoort op dim sum.

---

## 3. Diagnose

### Welke pillar drijft een eventuele te hoge ranking?

**Google (25%) gecombineerd met haGaoIndex (40%) bij ambigue reviews.**
Meet Noodles heeft een gezonde Google-rating (4.1) omdat het een fijn noedelrestaurant is — dat is terecht. Het probleem is dat de engine dit via `googleNormalized` meeneemt in de epicScore, en dat Claude, als er onvoldoende dumpling-specifieke reviews zijn, terugvalt op algemene positieve sentimenten om `haGaoIndex` te schatten.

### Past dit bij "vrij matig in werkelijkheid"?

Ja. De specifieke mismatch:
- **Werkelijkheid:** noedelrestaurant met dim sum op kaart als bijzaak. Kwaliteit dim sum wisselend.
- **Engine-inschatting:** Google 4.1 wordt meegenomen; als ook maar een handvol reviews "dumplings", "lekker", "vers" noemt, springt haGaoIndex naar 2.5-3.5.
- **Resultaat:** epicScore 55-65 terwijl echte dim sum-liefhebbers het restaurant zouden waarderen op 30-40.

### Welke zwakte uit audit-02a verklaart dit?

**Zwakte 1 (totalReviews noemer is kapot).** Claude berekent `dumplingMentionRatio = mentions / totalReviews`. Als `totalReviews` door de break-down van de noemer laag uitvalt (alleen de scraper-sample telt mee), lijkt het percentage dumplingmentions kunstmatig hoog. Zelfs 2 reviews met "dumpling" op 12 total → 17% — dat triggert een serieuze `dumplingMentionScore`.

**Zwakte 2 (geen recency).** Als Meet Noodles een paar jaar geleden betere dim sum had, leven die old reviews nog gewoon mee. Geen decay.

**Zwakte 3 (JSON-contract: dumplingScore bij null).** Als `dumplingQualityScore = null` (geen dumpling-reviews), gooit de engine een `dumplingScore = 0` terug. Maar `haGaoIndex` kan toch > 0 zijn — Claude mag die los schatten op basis van vage positieve signalen. Geen mechanisme dat haGaoIndex forceert naar 0 als dumplingQualityScore null is.

### De kernmismatch in één zin

De engine onderscheidt niet tussen "goed restaurant dat ook dim sum serveert" en "dim sum specialist" — het google-gewicht (25%) beloont algemene restaurantkwaliteit, terwijl haGaoIndex (40%) door Claude te makkelijk kan worden opgehoogd bij gebrek aan tegenwerking in de prompt.
