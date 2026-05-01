# Public Feed Debug — Why verified Restaurants Were Not Showing

**Date:** 2026-05-01
**Symptom:** Admin shows 20+ restaurants with `verified: true`, but the public homepage shows none/few.

---

## Query Path

`app/page.tsx` (server component, was statically rendered with 1h ISR)
  → `getPublicRestaurants()` in `lib/db.ts`
  → `getAllRestaurants()` + filter `isTrustedForPublicFeed`
  → `isTrustedForPublicFeed(r) → r.verified === true`

There is also `app/api/restaurants/route.ts` (currently unused by the public feed —
the homepage calls `getPublicRestaurants()` directly server-side). The homepage does
NOT go through the API route.

---

## Root Cause 1 — Anon client + RLS

`getAllRestaurants()` was using `getSupabase()` (anon key, subject to RLS) instead of
`getSupabaseAdmin()` (service-role, bypasses RLS).

If the `restaurants` table has any RLS SELECT policy that filters rows for the `anon`
role — for example a policy like `USING (data->>'verified' = 'true')` — the public
feed would silently see fewer rows than what's actually in the database.

The admin tab uses `getAllRestaurantsAdmin()` (service-role) and therefore sees
the full dataset, which explains the discrepancy.

**Fix:** All server-side reads in `lib/db.ts` (`getAllRestaurants`, `getRestaurantById`,
`getCompliments`) now use `getSupabaseAdmin()`. These functions are only called from
server components and route handlers, so using the service-role key is safe and
consistent with how admin already works.

---

## Root Cause 2 — Static generation with 1-hour ISR

`app/page.tsx`, `app/restaurant/[id]/page.tsx`, and `app/api/restaurants/route.ts`
all had `export const revalidate = 3600`. That means after an admin publishes a
restaurant, the homepage continues to serve the previously-cached HTML for up to
one hour.

**Fix:** Replaced `revalidate = 3600` with:

```ts
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

The homepage and detail pages now render on every request, so a "Publiceer" click
in admin is reflected immediately on the next public page load.

---

## Where `verified` Lives

The `restaurants` table has columns: `id`, `data` (JSONB), `updated_at`. The full
restaurant object — including the `verified` boolean — is stored inside `data`.
The reset endpoint (`/api/admin/reset-public`) updates `data.verified = false`.
The public feed reads `data` and filters in JavaScript on `r.verified === true`.

These read and write the same JSONB path, so there is no schema mismatch.

If you want to confirm counts directly in Supabase, run:

```sql
SELECT
  data->>'verified' AS verified,
  count(*) AS n
FROM restaurants
GROUP BY data->>'verified';
```

Expected after the curator-model rollout: a mix of `'true'`, `'false'`, and possibly
`NULL` for any legacy rows that never got the field set.

---

## Debug Logging Added

`getPublicRestaurants()` now logs:

```
[PublicFeed] total=<N> verified=<M> (gate: data.verified === true)
```

on every request. If `total` is much smaller than what admin shows, the database
read itself is being filtered (RLS) — which the admin-client switch above resolves.
If `verified` is much smaller than expected, the gate is correctly excluding
unverified rows.

---

## Summary of Fixes

| File | Change |
|---|---|
| `lib/db.ts` | `getAllRestaurants`, `getRestaurantById`, `getCompliments` → `getSupabaseAdmin()` |
| `lib/db.ts` | `getPublicRestaurants` logs `[PublicFeed] total=… verified=…` |
| `app/page.tsx` | `dynamic = 'force-dynamic'`, `revalidate = 0` |
| `app/restaurant/[id]/page.tsx` | `dynamic = 'force-dynamic'`, `revalidate = 0` |
| `app/api/restaurants/route.ts` | `dynamic = 'force-dynamic'`, `revalidate = 0` |
