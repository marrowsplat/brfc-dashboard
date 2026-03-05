# DashboardFC Changelog

All notable changes to DashboardFC will be documented here. Copy each new entry into the **#changelog** Slack channel after pushing.

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
