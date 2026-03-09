# DashboardFC — Roadmap

Future enhancements and planned work for DashboardFC.

---

## Planned: Virtual Live Table

**Priority:** High | **Complexity:** Medium

The league table currently relies on API-Football's `/standings` endpoint, which updates hourly on match days. To give users a "live" feel during matches, we should compute a **virtual standings table** client-side by:

1. Fetching live fixture scores (API-Football updates these every 15 seconds)
2. Taking the last confirmed standings as a base
3. Adjusting points, GF, GA, and GD based on current live scores
4. Re-sorting and displaying as a "Live Table" view

This would show what the table *would* look like if all current matches ended now — the same approach used by BBC Sport, Sky Sports, and most football apps.

**Implementation notes:**
- Use `/fixtures?live=all&league=LEAGUE_ID` for real-time scores
- Only activate during match windows (check if any league fixtures are in progress)
- Show a "LIVE" indicator on the table when virtual mode is active
- Fall back to confirmed standings when no matches are in play

---

## Planned: API Call & Caching Optimisation Deep Dive

**Priority:** High | **Complexity:** Medium

A dedicated session to audit and optimise our API usage and caching strategy. Key areas:

### 1. Smart scheduling — avoid unnecessary calls
- **No matches today?** Extend standings and fixtures cache TTL to 6+ hours (the data won't change)
- **Off-season?** Reduce all refresh rates to daily
- **Match in progress?** Shorten fixtures cache for live score updates
- Build a "match calendar" awareness layer that adjusts TTL dynamically

### 2. Shared cache architecture (multi-team scale)
- Standings are identical for all teams in a league — one API call serves 24 team pages
- Move cache key from `team+league+season` to `league+season` for standings
- Consider Vercel KV or Redis for shared server-side cache (vs in-memory per-instance)
- Evaluate edge caching with `stale-while-revalidate` for global distribution

### 3. Rate limit management
- Pro tier: 7,500 requests/day — audit current daily usage
- Track actual API calls vs cache hits (add logging)
- Set up alerts if approaching daily limit
- Priority queue: standings > fixtures > players > historical

### 4. Client-side optimisation
- Only fetch what's changed (ETags or last-modified headers)
- Lazy-load charts and player stats (not needed on initial paint)
- Consider WebSocket or Server-Sent Events for truly live updates in future

### 5. CDN and edge caching
- ISR revalidation already in place (v1.22) — monitor effectiveness
- Consider splitting into more granular API routes for better cache granularity
- Profile Vercel edge cache hit rates via analytics

---

> **Season rollover, promotion/relegation, troubleshooting, and multi-team scaling** are all documented in [`MAINTENANCE.md`](./MAINTENANCE.md).

---

## Ideas Backlog

- **Mobile league table improvements** — the Home/Away split view is cramped on mobile. Add horizontal scroll indicator, or simplify to essential columns only on small screens. Consider a swipeable card layout as an alternative
- **Branding & custom domain** — logo, colours, custom URL
- **Dark mode** — full theme toggle
- **Multi-team support** — team selector, URL routing per team
- **xG integration** — expected goals overlay on charts
- **Push notifications** — match day alerts, result notifications
- **PWA support** — installable app with offline mode
