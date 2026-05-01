# Data Investigation — Admin vs Public Count Discrepancy

**Date:** 2026-05-01  
**Symptom:** Admin panel shows 9 Amsterdam restaurants; public feed shows 15.

---

## Root Cause 1: Admin used the anon Supabase client (RLS-limited)

`/api/admin/restaurants` called `getAllRestaurants()`, which uses `getSupabase()` — the
anonymous client, subject to Row Level Security policies. If Supabase RLS restricts which
rows the anon role can read, the admin would silently receive fewer rows than actually exist.

**Fix:** New `getAllRestaurantsAdmin()` in `lib/db.ts` uses `getSupabaseAdmin()` (service-role
key), which bypasses RLS entirely. The admin route now calls this function.

---

## Root Cause 2: Admin defaults to verified-only view

`RestaurantsSection` defaults `showAll = false`, which filters to `r.verified === true`.
The public feed does **not** require `verified === true` — it only requires `epicScore >= 20`
plus dumpling signal checks (`isTrustedForPublicFeed`).

This means restaurants that are unverified but have a good score (e.g. engine-discovered
restaurants with epicScore ≥ 20 before manual review) appear in the public feed but are
**hidden** in the admin default view.

**Fix:** The "Toon alles" toggle in admin already exists for this — admins should enable it
to see the full picture. No code change needed here; it's expected UX.

---

## Root Cause 3: Admin page initialises from seed file

Before auth, `adminRestaurants` is seeded from `data/restaurants.json` (10 entries, 3
Amsterdam). After successful auth, the state is replaced by the full API response. If the
API call fails silently (network, env var missing), the admin stays on seed data.

**Fix:** `getAllRestaurantsAdmin()` returns `[]` on error (no seed fallback), so a failed
admin fetch now results in an empty list — clearly broken — rather than silently showing
stale seed data.

---

## Public Feed Logic (`isTrustedForPublicFeed`)

A restaurant appears publicly when ALL of these pass:

1. `status !== 'pending'`
2. `epicScore >= 20`
3. Not explicitly flagged as non-dim-sum (keyword check on `mustOrder` / `summary`)
4. At least ONE of: `haGaoIndex >= 1.0`, `dumplingMentionScore >= 5`, `dumplingQualityScore > 0`

`verified === true` is **not** a public-feed gate. It is used in admin only.

---

## Goedkeuren Bug

`handleApprove` in `InboxSection.tsx` called sync + verify, then checked `epicScore > 0`.
If sync returned a score of 0 (e.g. Claude API timeout, new restaurant with no data), the
handler threw an error and never called `onUpdate` / `onRemove`. The item stayed in inbox
forever despite being verified in Supabase.

**Fix:** Removed the blocking throw. Low score now logs a warning. `onUpdate` and `onRemove`
are called after any successful sync + verify, regardless of score.

---

## Seed File Amsterdam Count

| Metric | Count |
|--------|-------|
| Total seed entries | 10 |
| Amsterdam entries | 3 |
| Amsterdam + verified | 0 |
| Amsterdam + epicScore ≥ 20 | 3 |

The seed file is minimal and not the source of truth. Supabase is canonical.
