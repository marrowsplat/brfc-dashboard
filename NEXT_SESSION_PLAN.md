# DashboardFC — Next Session Plan

**Date:** 7 March 2026
**Version:** v1.22
**Priority:** Fix league table data accuracy

---

## Problem

The league table data lags behind reality by up to ~1.5 hours because:

1. **API-Football updates standings hourly** on match days
2. Our server cache adds up to 15 minutes
3. Vercel CDN adds up to 15 minutes

Meanwhile, the **fixtures endpoint** already has the latest results (e.g. Rovers 2-1 Crewe shows in Last Match, but standings haven't caught up). This creates a visible mismatch where users see a result but the table doesn't reflect it.

### Current data flow

```
API-Football /standings (hourly) → Server cache (15 min) → Vercel CDN (15 min) → Client (5 min refresh)
```

### What we already correct

We compute Bristol Rovers' form string from actual fixture results and override it in the standings table via the `correctedStandings` pattern in `page.tsx`. This fixes form accuracy but does NOT correct points, W/D/L, GF/GA, or any other team's data.

---

## Task 1: Virtual Live Table (client-side standings correction)

Extend the `correctedStandings` pattern to reconcile the **entire league table** using fixture data we already have.

### Approach

1. Fetch all **season fixtures** (already fetched — includes all completed results)
2. For each team in the standings, compare `played` count in standings vs actual completed fixtures involving that team
3. For any "uncounted" fixtures (results we have but standings haven't incorporated):
   - Determine W/D/L for both teams
   - Adjust points (+3 for win, +1 each for draw)
   - Adjust GF, GA, GD
   - Adjust W/D/L counts
   - Adjust played count
4. Re-sort the table by points (then GD, then GF as tiebreakers)
5. Recalculate rank positions
6. Override the standings table with corrected data

### Key challenge

The season fixtures endpoint only returns **Rovers' fixtures**, not all league fixtures. So we can only correct standings for Rovers and their opponents (since we know the scores). For other teams playing each other, we'd need a separate "all league fixtures" call.

### Options

- **Option A (quick):** Only correct Rovers' row and their opponents' rows from Rovers fixtures. Other teams may still be slightly off.
- **Option B (complete):** Add a new API call for all league fixtures (`/fixtures?league=41&season=2024`), not filtered by team. This gives us every result and we can correct the entire table. Costs one extra API call per 15 minutes.

**Recommendation:** Option B — one additional API call is cheap and gives us a fully accurate table.

### Files to modify

- `src/lib/api-football.ts` — Add `getAllLeagueFixtures()` function
- `src/app/api/fixtures/route.ts` — Add `type=league-season` option
- `src/app/page.tsx` — Build corrected table from standings + all league fixtures

---

## Task 2: API Call & Caching Optimisation Deep Dive

Detailed in `ROADMAP.md`. Key areas:

1. **Smart scheduling** — Don't call standings when no matches are playing
2. **Shared cache architecture** — Prepare for multi-team scale
3. **Rate limit tracking** — Monitor daily API usage
4. **Lazy loading** — Defer charts and player stats below the fold
5. **CDN monitoring** — Track ISR cache hit rates

---

## Task 3: Other items from previous sessions

- Dark mode toggle
- Multi-team support / team selector
- Branding and custom domain
- xG integration

---

## Current architecture reference

### Key files

| File | Purpose |
|------|---------|
| `src/lib/api-football.ts` | API client with in-memory caching |
| `src/lib/domain-types.ts` | Provider-agnostic type definitions |
| `src/lib/adapters/api-football-adapter.ts` | Transforms API responses to domain types |
| `src/app/api/standings/route.ts` | Standings API route (ISR 15 min) |
| `src/app/api/fixtures/route.ts` | Fixtures API route (ISR 15 min) |
| `src/app/api/players/route.ts` | Player stats API route (ISR 1 hour) |
| `src/app/api/historical-fixtures/route.ts` | Past season data (ISR 24 hours) |
| `src/app/api/fixture-stats/route.ts` | Match stats/events (ISR 24 hours) |
| `src/app/page.tsx` | Main dashboard (client component) |
| `src/app/charts.tsx` | Recharts chart components |

### Cache TTLs (v1.22)

| Data | In-memory | ISR (Vercel CDN) | Client refresh |
|------|-----------|-------------------|----------------|
| Standings | 15 min | 15 min | 5 min |
| Fixtures | 15 min | 15 min | 5 min |
| Players | 6 hours | 1 hour | 5 min |
| Historical | ~forever | 24 hours | 5 min |
| Match stats | 30 days | 24 hours | On demand |

### Environment variables

- `API_FOOTBALL_KEY` — API key
- `TEAM_ID` — 1334 (Bristol Rovers)
- `LEAGUE_ID` — 41 (League Two)
- `SEASON` — 2024 (API-Football season identifier for 2025/26)
