# Admin paneel audit

_Datum: 2026-05-01. Read-only audit, geen wijzigingen._

## TL;DR

- **Grootste verwarring:** drie verschillende "verwijder/scan" knoppen (Verwijder geflagde, Verwijder non-dim-sum, Cleanup-seeds onzichtbaar bij login) doen overlappende dingen, en de filter-tabs combineren twee onafhankelijke assen (status + source) zonder duidelijke uitleg dat ze AND-gecombineerd worden.
- **Gevaarlijkste actie:** "Verwijder alle geflagde" — één klik, één simpele JS `confirm()`, en hij loopt in een loop over de DELETE-endpoint zonder server-side bevestiging of dry-run. Bij een verkeerde agent-run kan dit tientallen restaurants permanent slopen.
- **Hoogste-impact opruiming:** verwijder de stille `cleanup-seeds`-fetch op mount + de losse "Verwijder non-dim-sum" knop, en vervang ze door één expliciete "Opschonen" sectie met preview en checkbox-bevestiging.

---

## 1. Admin UI — wat doet elke knop?

| # | Knop label | API route | Wat doet die route | Destructief? | Realistische frequentie |
|---|---|---|---|---|---|
| 1 | `▶ Run nu` (Kwaliteitsagent) | `POST /api/agent/audit` | Laat Claude Haiku elk restaurant beoordelen op dim-sum signalen, en flag/verwijdert op basis van de `mode` (eerste 7 dagen flag-only, daarna autonomous). | **Ja**, kan in autonomous-mode rijen direct uit Supabase verwijderen. | Wekelijks (cron draait al dagelijks om 03:00) — manueel zelden nodig. |
| 2 | `Sync alle restaurants` | Loop over `POST /api/sync/[id]` | Trekt voor elk restaurant Google Places, Iens, Tripadvisor, web-mentions binnen en herberekent EpicScore via Claude. | Nee (overschrijft scores en summary). | Wekelijks (cron `sync-all` doet dit al maandag 05:00). |
| 3 | `🗑️ Verwijder alle geflagde` | Loop over `DELETE /api/admin/delete/[id]` | Zoekt client-side alle restaurants met `verified === false` en verwijdert ze één voor één. | **Ja, irreversible**. Eén `window.confirm`, geen typed-confirmation, geen dry-run. | Maandelijks of zelden. |
| 4 | `🔍 {Stad}` (per stad scan) | `POST /api/admin/full-scan?city={city}` | Roept `discoverNewSpots(city)` aan en voegt nieuwe stubs toe (epicScore 0, verified false). | Nee (alleen toevoegen). | Maandelijks. |
| 5 | `🌍 Grote NL scan` | Lus over `POST /api/admin/full-scan` voor 14 steden | Zelfde als per-stad maar voor de hele lijst, met 30s timeout en 1.5s pauze. | Nee. | Zelden / kwartaal. |
| 6 | `🗑️ Verwijder non-dim-sum` | `POST /api/admin/cleanup?mode=non-dim-sum` | Verwijdert restaurants die volgens een keyword-match (pasta, pizza, ramen, "geen dim sum", haGao=0 EN mentions=0, etc.) geen dim sum zijn. Slaat seeds over. | **Ja, irreversible**. Eén `window.confirm`. | Zelden. |
| 7 | `➕ Voeg toe & sync` | `POST /api/admin/add-restaurant` | Volledige sync (Google + Iens + Tripadvisor + web + Claude) voor één nieuwe Place ID. | Nee. | Wekelijks. |
| 8 | `🔍 Zoek Place ID op naam` | `POST /api/admin/lookup` | Wrapt Google Places text-search om automatisch een Place ID te vinden. | Nee (read-only). | Telkens bij toevoegen — onderdeel van flow 7. |
| 9 | `🔄 Sync` (per restaurant) | `POST /api/sync/[id]` | Volledige re-sync van één restaurant. | Nee. | Dagelijks tot wekelijks bij debuggen. |
| 10 | `✕` (delete enkel) | `DELETE /api/admin/delete/[id]` | Verwijdert één restaurant uit Supabase. | **Ja, irreversible**. `window.confirm`. | Wekelijks. |
| 11 | `✓ Verifieer` | `POST /api/admin/verify/[id]` | Zet `verified: true`. Verschijnt alleen na een sync die nog niet geverifieerd is. | Nee (alleen status flip). | Wekelijks. |
| 12 | Filter chips `Alle / Geverifieerd / Te reviewen / Geflagd` | (client-side filter) | UI-filter, geen API. | Nee. | Continu. |
| 13 | Source-filter chips `Alle / Gebruiker / Engine / Seed` | (client-side filter) | UI-filter, geen API. | Nee. | Continu. |
| 14 | Tab `💬 Feedback` | `GET /api/admin/feedback` | Laadt rijen uit `bug_reports`-tabel. | Nee. | Dagelijks. |
| 15 | `✓ Afgehandeld` (per feedback) | `PATCH /api/admin/feedback` | Zet `status` van een feedback-item op `done`. | Nee. | Dagelijks. |
| 16 | (verstopt: stille fetch op login) | `POST /api/admin/cleanup-seeds` | Verwijdert seed-restaurants als er een echt-gesyncde versie met dezelfde naam bestaat. **Zonder waarschuwing of UI-feedback.** | **Ja**. Geen UI, geen log. | Bij elke login automatisch. |
| 17 | (niet gebruikt in UI) | `POST /api/admin/verify-all` | Zet alle restaurants met `epicScore > 20 && haGaoIndex > 0` op `verified: true`. | Nee. | Nooit gebruikt vanuit UI — dead endpoint? |

---

## 2. Filter tabs — wat betekenen ze?

### Status-filter (eerste rij chips)

| Filter | Conditie | Hoe komt iets hier terecht | Overlap |
|---|---|---|---|
| **Alle** | (geen filter) | Iedereen. | Bevat alles. |
| **Geverifieerd** | `r.verified === true` | Door `POST /api/admin/verify/[id]` (handmatig), `verify-all` (bulk, niet in UI), of als de agent-mode "keep" verdict opslaat. Sync zet `verified` niet vanzelf. | Een seed-restaurant kan `verified: true` zijn vanaf import. |
| **Te reviewen** | `r.verified !== true && r.verified !== false` (dus `undefined`) | Nieuwe stubs uit `full-scan` en `cron/discover` krijgen `verified: false` — zie bug hieronder. Oudere seeds zonder `verified`-veld vallen hier. | **Bug:** `full-scan` zet expliciet `verified: false`, dus die landen in **Geflagd**, niet in "Te reviewen". |
| **Geflagd** | `r.verified === false` | (a) `full-scan` voegt nieuwe spots toe met `verified: false`, (b) agent zet flag/remove verdict op false, (c) admin kan handmatig downgraden — er is geen knop hiervoor. | Overlapt zwaar met "nieuw ontdekt" — een verse spot is niet "geflagd door agent" maar gebruikt hetzelfde veld. |

### Source-filter (tweede rij chips)

| Filter | Conditie | Hoe komt iets hier terecht | Overlap |
|---|---|---|---|
| **Alle** | (geen filter) | Iedereen. | — |
| **Gebruiker** | `r.source === 'user' \|\| (r.source === undefined && r.status === 'suggested')` | Via `POST /api/suggest` (publiek formulier). | Restaurants zonder `source`-veld vallen hier ALLEEN als status `suggested` is. |
| **Engine** | `r.source === 'engine' \|\| r.source === undefined` | Via `cron/discover` of `full-scan`. | **Vangt ook alle legacy-records met `source = undefined` op.** Dus elk restaurant zonder source-tag telt automatisch als Engine, óók seeds en gebruikers-suggesties zonder duidelijke source. |
| **Seed** | `r.source === 'seed' \|\| r.source === undefined` | Uit `data/restaurants.json` bij import. | **Zelfde val:** undefined-source telt zowel als Engine als als Seed. Counts overlappen, en een restaurant kan in beide tellen. |

### Algemene overlap

- Status- en source-filter zijn AND-gecombineerd in code (twee `.filter()` calls op een rij), maar niet in UI. Als je "Geflagd" + "Gebruiker" aanklikt zie je alle door gebruikers ingestuurde stubs die nog niet verified zijn — dat is exact de "to-review queue", maar de UI maakt dat niet duidelijk.
- "Geflagd EN Geverifieerd" kan tegelijk niet bestaan (boolean), maar "Te reviewen EN Geflagd" wel niet, terwijl ze in de UI als losse chips staan alsof het meervoudige selectie kan zijn.
- **Source-counts kloppen niet:** doordat `undefined` zowel Engine als Seed matcht, tellen drie chips bij elkaar opgeteld méér dan "Alle".

---

## 3. Geautomatiseerde processen

### Cron jobs (Vercel `vercel.json`)

| Naam | Schedule | Trigger | Wat doet het | Faalmodi |
|---|---|---|---|---|
| `/api/cron/discover` | `0 6 * * 1` (maandag 06:00 UTC) | Vercel cron, Bearer `CRON_SECRET` | Roept `discoverNewSpots()` zonder cityFilter (dus heel NL?) en doet meteen volledige sync per nieuw spot — Google + Iens + Tripadvisor + web + Claude. | Lange runtime (`maxDuration = 60` is krap voor full sync per spot), Google Places quota, Iens/TA scrape kan blokkeren, partial failures laten halve records achter. |
| `/api/cron/sync-all` | `0 5 * * 1` (maandag 05:00 UTC) | Vercel cron | Re-sync van alle bestaande restaurants. | `maxDuration = 300` is een harde Vercel limiet; bij groei stopt dit gewoon halverwege. Geen resume / checkpoint. Claude rate limits. |
| `/api/agent/audit` | `0 3 * * *` (dagelijks 03:00 UTC) | Vercel cron + manuele trigger via UI | Quality-agent loopt over alle restaurants, vraagt Haiku om verdict, flagt of verwijdert. Eerste 7 dagen sinds eerste run = flag-only, daarna autonomous (cmd 1 hierboven). Na dag 7 draait hij ook nog maar 1× per week (maandag). | (a) Haiku JSON-parse fail → uitzondering, restaurant overgeslagen zonder retry. (b) `getAgentMode` baseert mode op eerste agent_runs row — als die tabel ooit leeg gemaakt wordt, terug naar flag-only zonder waarschuwing. (c) `agent_runs` insert kan falen → run draait alsnog door zonder tracking. (d) **In autonomous mode kan een verkeerd Haiku-verdict 1 restaurant per call definitief verwijderen** met alleen een log-regel. |

### Stille processen

- **`POST /api/admin/cleanup-seeds`** wordt op elke admin-login automatisch aangeroepen vanuit `useEffect` zonder UI-feedback. Verwijdert seed-rows als er een gelijknamige niet-seed bestaat. Kan onverwacht data weghalen als naming inconsistent is.

---

## 4. Lifecycle van een restaurant

```
ENTRY POINTS
============

  [Discovery / cron]                [Manual admin add]              [User suggest]                 [Seed import]
  cron/discover (ma 06:00)          POST /api/admin/                POST /api/suggest              data/restaurants.json
  + admin "🌍 Grote NL scan"        add-restaurant                  (publiek formulier,             →
  + admin "🔍 {Stad}"               (volledige sync direct)          rate-limited 5/dag/IP)         syncSeedToSupabase()
         │                                  │                              │                              │
         ▼                                  ▼                              ▼                              ▼
  STUB (epicScore 0,                   FULLY SYNCED                   STUB (status='suggested',      verified:true (meestal)
   verified:false,                     (verified:false                 verified:false,                source:'seed'
   source:'engine')                     by default)                    source:'user')
         │                                  │                              │                              │
         └──────────────┬───────────────────┴──────────────────────────────┴──────────────────────────────┘
                        │
                        ▼
              ┌──────── SYNC ─────────┐
              │  cron/sync-all (ma 05:00) │
              │  + admin "Sync alle"      │
              │  + admin per-restaurant   │
              │  + auto-sync na add       │
              └──────────────┬────────────┘
                             ▼
                  Berekent epicScore, haGaoIndex,
                  scores, summary, mustOrder
                  (Google + Iens + TA + Web + Claude)
                  → verified-status WORDT NIET AANGERAAKT
                             │
                             ▼
              ┌──────── AGENT AUDIT ──────────┐
              │  cron/agent/audit (dagelijks 03:00,    │
              │  na dag 7 alleen ma)                    │
              │  Mode = flag (week 1) → autonomous     │
              └──────────────┬─────────────────────────┘
                             ▼
              Haiku verdict: keep | flag | remove
                  │              │              │
                  │              │              ▼
                  │              │       autonomous: row direct uit DB weg
                  │              │       flag-mode: verified=false + summary "[AGENT FLAGGED]"
                  │              ▼
                  │       altijd: verified=false + summary "[AGENT REVIEW]"
                  ▼
              geen verandering
                             │
                             ▼
              ┌──────── HUMAN GATES ──────────┐
              │  - "✓ Verifieer" knop        │
              │  - "🗑️ Verwijder geflagde"   │
              │  - "🗑️ Verwijder non-dim-sum"│
              │  - "✕" delete                 │
              │  - cleanup-seeds (onzichtbaar)│
              └──────────────┬────────────────┘
                             ▼
                    END STATES
              ┌────────┬────────┬─────────────┬──────────────┐
              ▼        ▼        ▼             ▼              ▼
          verified  flagged  deleted     suggested-      "te reviewen"
          (publiek  (niet    (weg uit    pending         (verified
           feed)    publiek) Supabase)   (status=        undefined,
                                         suggested,      hangt)
                                         verified=false)
```

**Plus extra public-feed gate:** `isTrustedForPublicFeed` in `lib/db.ts` filtert nog eens hard op `epicScore >= 20`, geen `'pending'`-status, geen "geen dim sum"/"pasta"/"italiaans" in summary, en niet alle drie van `haGao<1.0 && mentions<5 && quality<=0`. Een restaurant kan dus `verified:true` zijn én alsnog onzichtbaar voor publiek — dat is voor de admin nergens uitgelegd, alleen subtiel via de "geen dumpling mentions / Ha Gao te laag / score te laag" hint-regel.

---

## 5. Redundanties en verwarring

### Knoppen die hetzelfde of bijna hetzelfde doen

- **`🗑️ Verwijder alle geflagde`** vs **`🗑️ Verwijder non-dim-sum`** vs **agent in autonomous-mode**: alle drie kunnen rijen verwijderen op basis van overlappende criteria. De agent flagt → "Verwijder geflagde" verwijdert. Maar "Verwijder non-dim-sum" gebruikt een eigen keyword-lijst die niet identiek is aan wat de agent gebruikt. Resultaat: drie schoonmaak-paden die elk een ander oordeel kunnen geven over hetzelfde restaurant.
- **`Sync alle restaurants` (knop)** vs **`cron/sync-all` (cron)**: doen exact hetzelfde. De knop is in 99% van de gevallen onnodig, maar staat groot en in goud bovenin.
- **`🔍 {Stad}` per-stad knoppen** vs **`🌍 Grote NL scan`**: de NL scan is letterlijk een loop over dezelfde 14 stadknoppen. Twee UI-elementen voor één feature.
- **`/api/admin/verify/[id]` (knop)** vs **`/api/admin/verify-all`** (geen UI): er is een bulk-verify endpoint die in geen knop hangt. Dead code óf vergeten knop.
- **`/api/admin/cleanup-seeds`** draait stil bij login én **`/api/admin/cleanup?mode=non-dim-sum`** is een handmatige knop. Eén schoonmaakt seeds, ander schoonmaakt non-dim-sum, beide noemen ze "cleanup". Verwarrend.

### Filters die overlappen

- Source-filter: `engine` matcht `source==='engine' || source===undefined`. Zelfde voor `seed` en `gebruiker` (deels). Een record met `source: undefined` valt in **alle drie** de niet-Alle filters. Counts kloppen niet, en het mentale model "elk restaurant heeft één bron" is gewoon onwaar in de data.
- Status-filter combineert "menselijke verificatie" (`verified:true`) en "agent flag" (`verified:false`) in hetzelfde boolean veld. Een nieuwe scan-stub krijgt `verified:false` — die staat dus naast écht door de agent geflagde rijen onder "Geflagd". Geen onderscheid tussen "nog niet bekeken" en "actief afgekeurd".
- Status- en source-filter zijn beide chips in dezelfde stijl, naast elkaar. Niet duidelijk dat ze AND-werken (twee onafhankelijke assen).

### Gevaarlijke acties die te makkelijk zijn

- **`🗑️ Verwijder alle geflagde`**: één klik, één `window.confirm`, geen dry-run preview, geen "type DELETE", geen lijst van wat er weg gaat vóór bevestiging. Op een 200-restaurant DB met een misdraaide agent kun je hele steden wissen.
- **`🗑️ Verwijder non-dim-sum`**: zelfde — één confirm. De keyword-match is bovendien naïef (alles met "kebab" in de naam → weg, ook al staat het op een dim-sum naam zoals "Kebab & Dumplings").
- **Agent autonomous-mode**: schakelt zichzelf in na 7 kalenderdagen sinds de eerste run. Geen admin-toggle om hem in flag-mode te houden. Geen knop om mode te zien zonder een run te starten. Een nieuwe omgeving die de DB reset valt automatisch terug naar flag-mode zonder zichtbare melding.
- **`cleanup-seeds` op login**: draait op elke pageload van `/admin/sync` na auth, in een fire-and-forget fetch. Geen UI, geen log, kan je seed-data onverwacht slopen.
- **Auth = één wachtwoord in een textbox** opgeslagen in React state. Geen rate-limit op de admin API's, geen sessie-token. Wie het secret heeft kan via curl alle DELETE-endpoints aanroepen. Voor een productie-admin minimaal acceptabel.

### Features die zelden of nooit gebruikt worden

- **`/api/admin/verify-all`** — geen knop in UI. Code is er, route bestaat, niemand roept hem aan.
- **Per-stad scan knoppen voor 14 individuele steden** — er is een NL-knop die hetzelfde doet. Realistisch klikt niemand er 14 keer op.
- **Source-filter "Seed"** — zodra `cleanup-seeds` zijn werk heeft gedaan zijn de meeste seeds weg. Maar de filter blijft staan met een count die door de undefined-bug overdreven hoog is.
- **Het hele "Te reviewen"-bucket** is in praktijk leeg, omdat `full-scan` `verified:false` zet (niet `undefined`). Alleen oude legacy-records vallen hier.

### Verwarring voor een niet-technische admin

- **Jargon**: "EpicScore", "haGaoIndex", "dumplingMentionScore" worden getoond zonder uitleg. Voor een ontwikkelaar is "Ha Gao te laag" duidelijk, voor een copywriter niet.
- **Cryptische status-mix**: een restaurant kan `verified:false`, `epicScore:0`, `status:'suggested'`, `source:'user'` zijn — vier velden die min of meer hetzelfde zeggen ("nieuw, nog niets gedaan"), elk gerenderd als eigen badge.
- **`[AGENT FLAGGED]` / `[AGENT REVIEW]` tags geprepend in de summary** — dit is data-pollutie. Bij een volgende sync wordt de summary opnieuw door Claude geschreven, dus de tag verdwijnt. De `agentReason` zou apart opgeslagen moeten worden (en wordt in de UI ook al apart getoond als veld dat blijkbaar bestaat), niet in een vrije tekst-summary geramt.
- **"Sync nodig" badge** naast naam vs. **"⚠️ Niet geverifieerd" badge** naast naam — het verschil is zeer subtiel (epicScore===0 vs verified!==true) en niet uitgelegd.
- **`humanizeError`** vertaalt alleen `Unauthorized` naar Nederlands. Alle andere errors worden onvertaald getoond ("HTTP 500", "Failed to fetch").

---

## 6. Voorgestelde restructure (outline)

### Sectie 1 — `Inbox`

- **Wat komt hier:** alles wat aandacht nodig heeft. User-suggesties (`source:'user' && status:'suggested'`), agent-flags (`verified:false && agentReason`), nieuwe ontdekkingen die nog gesyncd moeten (`epicScore===0`). Eén unified queue, gesorteerd op leeftijd.
- **Knoppen per item:** Goedkeuren (= sync + verify), Weigeren (= delete met expliciete reden-tekstveld), Later.
- **Wat verdwijnt of wordt verstopt:**
    - Status-filter chips → niet meer nodig, alles wat aandacht vraagt staat hier.
    - Source-filter chips → wel zichtbaar maar als simpele tag op item-niveau, niet als toggle.
    - "Te reviewen" als losse filter → opgegaan in Inbox.
- **Safety guards:**
    - Bulk-acties (Goedkeur 5 / Weiger 5) alleen na het selecteren van rijen, niet als één grote knop.

### Sectie 2 — `Restaurants` (read-mostly catalog)

- **Wat komt hier:** lijst van alle `verified:true` restaurants. Zoekbalk + stad-filter + sortering op epicScore. Per-restaurant: detail, "🔄 Herberekenen", "⚠️ Markeer probleem" (zet `verified:false` met reden, gaat terug naar Inbox).
- **Wat verdwijnt of wordt verstopt:**
    - "Sync alle restaurants" knop → weg (cron doet het, manuele sync per restaurant blijft).
    - Per-stad scan knoppen → weg (onder Beheer als één lijst).
    - "Grote NL scan" → onder Beheer.
- **Safety guards:**
    - "✕" delete vereist typed-confirmation: typ de naam van het restaurant.
    - Geen massa-verwijder knop hier.

### Sectie 3 — `Beheer` (rare admin tasks)

- **Wat komt hier:** Discovery (één knop "Scan NL" met sub-checklist van steden), Quality-agent run + mode-toggle (forceer flag/autonomous met expliciete keuze, niet automatische tijd-gebaseerde flip), feedback-tab, opschoning (één "Opruimen" wizard die preview toont van wat hij zou verwijderen vóór bevestiging).
- **Wat verdwijnt of wordt verstopt:**
    - `cleanup-seeds` op login → vervangen door "Seeds opruimen" knop in deze sectie met preview.
    - `verify-all` endpoint → ofwel knop hier, ofwel verwijder de route.
    - "Verwijder alle geflagde" → vervangen door bulk-actie in Inbox sectie 1, na expliciete selectie.
    - "Verwijder non-dim-sum" → vervangen door één gegeneraliseerde "Opruim wizard" die zowel keyword-match als agent-verdict samenvoegt en preview toont.
- **Safety guards:**
    - Agent autonomous-mode achter expliciete toggle "Ik begrijp dat de agent permanent kan verwijderen" — niet automatisch na 7 dagen.
    - Opruim wizard toont eerst lijst (naam, reden, leeftijd) en vraagt typ "VERWIJDER" om door te gaan.
    - Elke destructieve actie logt naar een `admin_audit_log` tabel met user-secret-hash, timestamp, rijen geraakt — momenteel bestaat dat niet en is post-mortem na een ramp onmogelijk.

---

_Einde audit._
