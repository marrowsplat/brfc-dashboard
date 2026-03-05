# DashboardFC — Architecture Guide

## Overview

DashboardFC is a live football stats dashboard for Bristol Rovers FC, built with Next.js and deployed on Vercel. It pulls data from API-Football and presents it as a responsive single-page dashboard.

**Live site:** [brfc-dashboard.vercel.app](https://brfc-dashboard.vercel.app)
**Source:** [github.com/marrowsplat/brfc-dashboard](https://github.com/marrowsplat/brfc-dashboard)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 + TypeScript | Full-stack React framework with server-side API routes |
| Styling | Tailwind CSS | Utility-first CSS with custom theme (BRFC colours) |
| Data | API-Football (Pro) | League standings, fixtures, match events |
| Hosting | Vercel | Auto-deploys from GitHub on every push |
| Source control | GitHub | Repository at marrowsplat/brfc-dashboard |

---

## Data Flow

```
API-Football (external)
       │
       ▼
┌──────────────────────────┐
│  api-football.ts         │  Fetches raw data, caches in memory
│  (API client + cache)    │
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  API Routes              │  Thin server-side endpoints
│  /api/standings          │  Each route calls the API client,
│  /api/fixtures           │  then passes raw data through
│  /api/fixture-stats      │  the adapter before returning
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  api-football-adapter.ts │  Transforms API-Football response
│  (adapter layer)         │  shapes into our domain types
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  page.tsx                │  React dashboard component
│  (frontend)             │  Fetches from API routes, renders cards
└──────────────────────────┘
       │
       ▼
    Browser
```

---

## Abstraction Layer

The dashboard has a deliberate separation between external API shapes and our own data model. This means we can swap data providers or combine multiple sources without rewriting the frontend.

**Three layers:**

1. **Domain types** (`src/lib/domain-types.ts`) — the canonical types that define what the dashboard works with. These have no dependency on any external API. The frontend imports only from here.

2. **Adapter** (`src/lib/adapters/api-football-adapter.ts`) — pure functions that transform raw API-Football responses into domain types. This is the only file that knows about API-Football's data shape.

3. **API client** (`src/lib/api-football.ts`) — handles HTTP calls to API-Football and caches responses in memory. Returns raw API-Football data which the adapter then transforms.

**To add a new data provider** (e.g. for xG stats), you would:
1. Create a new adapter file (e.g. `adapters/statsbomb-adapter.ts`)
2. Add any new fields to `domain-types.ts`
3. Call the new adapter in the relevant API route
4. No frontend changes needed

---

## File Structure

```
brfc-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard UI (React, client-side)
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Tailwind theme + custom CSS
│   │   └── api/
│   │       ├── standings/route.ts   # GET /api/standings
│   │       ├── fixtures/route.ts    # GET /api/fixtures
│   │       └── fixture-stats/route.ts # GET /api/fixture-stats
│   └── lib/
│       ├── domain-types.ts          # Our canonical types (provider-agnostic)
│       ├── api-football-types.ts    # API-Football response shapes (internal)
│       ├── api-football.ts          # API client + in-memory cache
│       └── adapters/
│           └── api-football-adapter.ts  # Transforms API-Football → domain types
├── .env.local                       # API key + config (git-ignored)
├── .env.example                     # Template for setup
├── CHANGELOG.md                     # Release notes
├── ARCHITECTURE.md                  # This file
└── package.json
```

---

## API Routes

### GET /api/standings
Returns the league table and our team's entry.
```
Response: {
  leagueName: string
  team: StandingEntry | null    (our team's row)
  table: StandingEntry[]        (full league table)
}
```

### GET /api/fixtures
Returns fixtures filtered by type.
```
Query params:
  type = "last" | "next" | "season"
  count = number (default 10)

Response: Fixture[]
```

### GET /api/fixture-stats
Returns match statistics and events for a specific fixture.
```
Query params:
  id = fixture ID (required)

Response: {
  stats: object[]               (raw match statistics)
  events: FixtureEvent[]        (goals, cards, subs)
}
```

---

## Caching Strategy

All API calls go through an in-memory cache to minimise external requests.

| Data | Cache duration | Reason |
|------|---------------|--------|
| Standings | 2 hours | Changes only on match days |
| Season fixtures | 2 hours | Schedule rarely changes |
| Match statistics | 30 days | Historical, won't change |
| Match events | Never cached if empty | Retries until data available |

The event fetching has a three-step fallback:
1. Check if the season fixtures cache already contains events inline
2. Try the dedicated `/fixtures/events` endpoint
3. Try fetching the full fixture detail (includes events)

Empty results are never cached, so the system keeps retrying until events become available.

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `API_FOOTBALL_KEY` | (secret) | API-Football authentication |
| `TEAM_ID` | `1334` | Bristol Rovers |
| `LEAGUE_ID` | `42` | League Two (2025/26) |
| `SEASON` | `2025` | Current season |

These are set in Vercel (Settings → Environment Variables) and in `.env.local` for local development.

---

## Deployment

The project auto-deploys via Vercel whenever code is pushed to GitHub:

```
git push → GitHub → Vercel detects change → builds → deploys
```

Typical build time is under a minute. No manual deployment steps needed.

To deploy manually or redeploy: Vercel dashboard → Deployments → Redeploy.

---

## Collaboration

| Channel | Purpose |
|---------|---------|
| #changelog | Release notes (copy from CHANGELOG.md) |
| #the-plan | Strategy and roadmap |
| #general | Announcements and chat |
| #ideas | Feature requests and brainstorming |

---

## Roadmap

**Phase 2 (remaining):** More match detail, mobile polish, DashboardFC branding
**Phase 3:** Charts and trends — goals/points lines, form momentum, home vs away
**Phase 4:** Dark mode, multi-team support, xG data, mobile app
