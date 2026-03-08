# DashboardFC Changelog

All notable changes to DashboardFC will be documented here. Copy each new entry into the **#changelog** Slack channel after pushing.

---

## v1.25 — 8 March 2026

**UX & performance — lazy loading, live countdown, skeletons, and more**

### New
- **Live countdown timer** — Next Match card now shows a ticking countdown (days/hours/minutes/seconds) instead of a static "In 3 days"
- **Recent Results list** — compact two-column list showing last 10 results with result badge, opponent, score, and date
- **Season progress bar** — gold progress bar in the header showing games played out of 46 with percentage
- **GD trend sparkline** — SVG mini-chart in Season Overview showing goal difference per match over the last 10 games. Green = improving, red = worsening

### Improved
- **Lazy-loaded charts** — Points, Goals, and Home/Away charts now load on demand via `next/dynamic`, reducing initial page weight by ~80KB (Recharts is deferred)
- **Loading skeletons** — replaced generic grey bars with layout-specific skeleton placeholders for match cards, stat cards, and table rows. Feels faster on load
- **Loading card variants** — match, stat, and table skeletons now match the actual card layout they replace

### Under the hood
- Charts use `dynamic(() => import(...), { ssr: false })` for code splitting
- Countdown component uses 1-second interval with cleanup on unmount
- GD sparkline is pure SVG (no chart library), keeping it lightweight
- Mobile league table improvements saved to ROADMAP.md for future session
- TypeScript clean — zero type errors

---

## v1.24 — 8 March 2026

**Enhanced league table — Home/Away split, PPG, Draw %, and header tooltips**

### New
- **Home/Away split view** — toggle button switches the table between overall W/D/L and a full home/away breakdown (HW/HD/HL/HF/HA + AW/AD/AL/AF/AA)
- **PPG column** — points per game average shown for every team
- **%D column** — draw percentage, useful for spotting teams that draw a lot
- **Column header tooltips** — hover over any column header to see what the abbreviation means (e.g. "GD" → "Goal difference (goals scored minus goals conceded)")

### Under the hood
- Extended `StandingEntry` domain type with home/away goals (gf/ga) alongside existing W/D/L
- Adapter now extracts home/away goals from API-Football response
- Virtual live table correction now includes full home/away stats when rebuilding from fixtures
- New reusable `Th` component for table headers with tooltip support

---

## v1.23 — 8 March 2026

**Virtual Live Table — league table now corrects itself from fixture results**

### New
- **Virtual Live Table** — the league table now cross-references standings with actual fixture results and automatically corrects points, W/D/L, GF/GA, GD, and form for every team. If the API standings are behind (up to 1 hour on match days), the table fills in the gaps from completed fixtures
- **All-league fixtures endpoint** — new `/api/league-fixtures` route fetches every match in the league (not just Rovers), giving us the data to correct the full table
- **Form strings computed from fixtures** — every team's form dots are now derived from actual results rather than the sometimes-stale API form field
- **Auto re-ranking** — after corrections, the table is re-sorted by points → GD → GF and ranks are reassigned, so positions are always accurate

### Under the hood
- New `getAllLeagueFixtures()` in api-football.ts — fetches all league fixtures, cached 15 minutes
- Replaced the old `correctedStandings` (which only fixed Rovers' form) with a full table reconciliation that handles every team
- When fixture data shows more games played than standings report, the entire row switches to fixture-derived stats
- TypeScript clean — zero type errors

---

## v1.22 — 7 March 2026

**Caching overhaul — fresher data, smarter scaling**

### Improved
- **Standings & fixtures now refresh every 15 minutes** — reduced from 2-hour cache, matching API-Football's hourly update cycle more closely
- **ISR (Incremental Static Regeneration)** on all API routes — Vercel CDN edge-caches responses and revalidates automatically, so one fetch serves all users
- **HTTP Cache-Control headers** on every route with `stale-while-revalidate` — users always get an instant response while fresh data loads in the background
- **Client-side auto-refresh** — dashboard silently re-fetches every 5 minutes so open tabs stay current without manual reload
- **"Refreshes automatically" indicator** in header so users know data stays live
- **Tiered caching** — standings/fixtures at 15 min, players at 1 hour, historical data at 24 hours (data changes at different rates)

### Under the hood
- Standings cache keyed by league (not team) — all team pages share one cached copy at scale
- Added `ROADMAP.md` documenting virtual live table and caching deep dive plans
- TypeScript clean — zero type errors

---

## v1.21 — 5 March 2026

**Big feature drop — charts, tables, squad stats, and season comparison!**

### New
- **Points Accumulation chart** — line chart tracking cumulative points vs promotion, playoff, and relegation pace lines, with a "How is this calculated?" info explainer
- **Historical comparison** — 2024/25 season overlaid as a dotted grey line on the Points chart so you can compare trajectories
- **Goals Trend chart** — cumulative goals scored vs conceded over the season
- **Home vs Away chart** — grouped bar chart comparing home/away wins, draws, losses, goals, and points
- **League Table widget** — compact 5-row view centred on Rovers with colour-coded promotion/playoff/relegation zones and a "Full table" expand toggle
- **Squad Stats table** — full squad with photo, position, appearances, goals, assists, cards, and rating. Sortable by Goals, Assists, Apps, Cards, or Rating. Top 10 by default with expand to full squad
- **Enhanced form guide** — now shows points from last 6, unbeaten/winless run streak, and clean sheet count as stat pills

### Under the hood
- New `/api/players` endpoint with paginated API-Football player data
- New `/api/historical-fixtures` endpoint for past season comparison
- PlayerStats domain type and adapter transform
- Recharts 3.7.0 for all chart components
- Charts split into dedicated `charts.tsx` module

---

## v1.2 — 5 March 2026

**Match stats and mobile polish!**

### New
- Match stats bars in Last Match card: possession, shots on target, total shots, corners, fouls — shown as visual comparison bars between home and away teams
- MatchStats domain type and adapter (provider-agnostic)

### Improved
- Header scales down cleanly on mobile (smaller badge, tighter text)
- Team logos in match cards smaller on mobile
- Team names truncate instead of wrapping on narrow screens
- Score text responsive sizing
- Overall tighter spacing on small screens

---

## v1.1 — 5 March 2026

**Live current season data!** Upgraded to API-Football Pro and switched to 2025/26 League Two.

### Changes
- Upgraded to API-Football Pro tier
- Switched from 2024/25 League One (test data) to live 2025/26 League Two season
- Added abstraction layer: domain types + adapter pattern (provider-agnostic architecture)
- Added version number in footer
- Added this changelog

### What this means
- All stats are now real and up to date
- Match events and goalscorers more reliable
- Higher API limits (no more free tier workarounds)
- Codebase ready to support additional data sources (e.g. xG)

---

## v1.0 — 5 March 2026

**First public release!** DashboardFC is live at [brfc-dashboard.vercel.app](https://brfc-dashboard.vercel.app).

### What's included
- League position card with ordinal ranking (e.g. 22nd), points, W/D/L record, goal difference
- Recent form strip showing last 6 results with W/D/L badges
- Points per game with home/away split
- Last match card with scoreline, half-time score, and goalscorers split by team
- Next match card with countdown and venue
- Season overview with goals scored/conceded, games played, win rate
- Responsive layout (mobile, tablet, desktop)
- Visual polish: gradient header, gold accents, hover cards, animated badges
- Smart API caching to stay within free tier limits (~10-15 calls/day)

### Under the hood
- Next.js + TypeScript + Tailwind CSS
- API-Football integration with in-memory caching
- Abstraction layer with domain types and adapter pattern (provider-agnostic)
- Deployed to Vercel with auto-deploy on push
- Source: [github.com/marrowsplat/brfc-dashboard](https://github.com/marrowsplat/brfc-dashboard)

### Known limitations (free tier)
- Using 2024/25 League One data (current season requires Pro upgrade at €19/month)
- 100 API requests/day limit (handled by caching)
- Match events occasionally unavailable (multi-source fallback in place)
