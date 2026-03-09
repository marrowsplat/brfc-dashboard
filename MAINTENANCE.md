# DashboardFC — Maintenance Guide

This document covers everything needed to keep DashboardFC running smoothly, from routine end-of-season tasks to scaling up for multi-team support.

---

## Architecture Overview

DashboardFC pulls all its data from API-Football (v3, Pro tier). The key configuration lives in environment variables, which are read by the server-side API client (`src/lib/api-football.ts`) and, where needed, exposed to the client via the `NEXT_PUBLIC_` prefix.

The data pipeline is: **API-Football → in-memory cache → API routes (ISR) → Vercel CDN → client-side SWR refresh**. Each layer has its own TTL, so changes to the source data propagate within roughly 15–20 minutes during the season.

### Key environment variables

| Variable | Purpose | Example |
|---|---|---|
| `API_FOOTBALL_KEY` | API authentication | `70996d...` |
| `TEAM_ID` | The team to display | `1334` (Bristol Rovers) |
| `LEAGUE_ID` | The league the team plays in | `42` (League Two) |
| `SEASON` | The current season (start year) | `2025` (for 2025/26) |
| `NEXT_PUBLIC_SEASON` | Client-side copy of SEASON | Must match `SEASON` |

These are set in two places: `.env.local` for local development, and the Vercel project dashboard for production.

### API-Football league IDs (English football pyramid)

| League | ID |
|---|---|
| Premier League | 39 |
| Championship | 40 |
| League One | 41 |
| League Two | 42 |
| National League | 43 |
| FA Cup | 45 |
| EFL Trophy | 46 |
| League Cup | 48 |

---

## Routine Maintenance

### During the season

There is very little to do during the season. The data refreshes automatically via the caching layers. Things to keep an eye on:

- **API quota** — Pro tier allows 7,500 requests/day. Monitor usage via the API-Football dashboard if traffic grows.
- **Vercel deployment health** — check the Vercel dashboard occasionally for failed builds or function errors.
- **Data accuracy** — after a match day, spot-check the league table and squad stats against a trusted source (e.g. Sky Sports, BBC Sport). The virtual live table corrects most staleness, but edge cases like postponements or points deductions may need manual attention.

### Off-season (May–July)

Between seasons, the API will still return the completed season's data. No action is needed until the new season begins — typically early August for the EFL.

---

## End-of-Season Checklist

**When to do this:** Once the new season's data is available in API-Football (usually late July / early August, after pre-season fixtures begin appearing).

### Step 1 — Confirm the new season is live in API-Football

Before changing anything, verify the API has data for the new season:

```bash
# Replace 2026 with the new season year
curl -s "https://v3.football.api-sports.io/fixtures?team=1334&season=2026&league=42" \
  -H "x-apisports-key: YOUR_KEY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Fixtures found: {data.get(\"results\", 0)}')
"
```

If this returns 0, the new season isn't available yet — wait and try again later.

### Step 2 — Check for promotion or relegation

If the team has changed division, identify the new league ID from the table above. For example, if Rovers are promoted from League Two to League One, `LEAGUE_ID` changes from `42` to `41`.

You can verify which league the team is in for a given season:

```bash
curl -s "https://v3.football.api-sports.io/leagues?team=1334&season=2026" \
  -H "x-apisports-key: YOUR_KEY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for l in data.get('response', []):
    league = l['league']
    print(f'{league[\"name\"]} (ID: {league[\"id\"]})')
"
```

### Step 3 — Update environment variables

Update in **both** `.env.local` and the Vercel project settings:

| Variable | What to change |
|---|---|
| `SEASON` | Increment by 1 (e.g. `2025` → `2026`) |
| `NEXT_PUBLIC_SEASON` | Must match `SEASON` |
| `LEAGUE_ID` | Only change if promoted or relegated |
| `TEAM_ID` | Should not change |

### Step 4 — Redeploy

After updating Vercel env vars, trigger a production redeploy:

```bash
vercel --prod
```

Or simply push any commit to trigger an automatic deploy.

### Step 5 — Verify

Run through this checklist on the live site:

- [ ] League table loads with new season data (correct league name, teams)
- [ ] Squad Stats shows correct appearances and goals (not cup stats, not last season)
- [ ] Historical comparison chart shows last season's curve alongside the new one
- [ ] Fixtures show the new season schedule
- [ ] Next match countdown is pointing to the correct upcoming fixture
- [ ] Recent results section is empty or shows early-season results (not last season's)
- [ ] Season progress bar resets to 0/46 (or whatever the new total is)

### Step 6 — Optional housekeeping

- Review `CHANGELOG.md` — consider adding a "Season 20XX/YY" header
- Archive any notes in `NEXT_SESSION_PLAN.md` that are no longer relevant
- Check the `ROADMAP.md` for items that were completed during the season

---

## Multi-Team Support: Promotion & Relegation at Scale

When DashboardFC supports every team in the EFL (currently 72 teams across three divisions), season rollover becomes more complex because teams move between leagues. Here is the plan for handling this.

### The problem

Each season, across the Championship, League One, and League Two:
- 3 teams are promoted from each division (2 automatic + 1 via playoffs)
- 3 teams are relegated from each division (bottom 3, except the Championship which relegates to League One)
- Teams entering/leaving the EFL entirely (promoted from National League, relegated from Championship to/from the Premier League)

That means roughly 12–18 teams change league ID every season.

### Proposed solution: team-to-league mapping table

Rather than storing `LEAGUE_ID` as a single env var, multi-team mode would use a mapping that is refreshed once per season:

```
teams.json (or database table):
{
  "1334": { "name": "Bristol Rovers", "leagueId": 42 },
  "50":   { "name": "Manchester City", "leagueId": 39 },
  ...
}
```

### Season rollover steps for multi-team

1. **Query API-Football for each team's current league.** The `/leagues?team={id}&season={year}` endpoint returns which leagues a team is registered in for a given season. Run this for all 72+ teams:

```bash
# Pseudo-script: for each team, fetch their league for the new season
for team_id in 1334 50 33 ...; do
  curl -s "https://v3.football.api-sports.io/leagues?team=$team_id&season=2026" \
    -H "x-apisports-key: YOUR_KEY"
done
```

2. **Build the new mapping.** From the API responses, extract each team's primary domestic league ID (filtering out cups like FA Cup, League Cup, EFL Trophy).

3. **Detect movements.** Compare the new mapping against the previous season's mapping to identify promotions, relegations, and any new teams entering the system.

4. **Update the data store.** Write the new mapping to whatever storage is used (JSON file, database, Vercel KV).

5. **Verify edge cases:**
   - Teams relegated out of the EFL entirely (to National League) — decide whether to keep or archive
   - Teams promoted into the EFL from the National League — add to the mapping
   - Points deductions or league restructuring (rare but possible)

### Automation opportunity

This process can be largely automated with a script that:
1. Fetches all EFL team IDs from API-Football (`/teams?league=40&season=2026`, repeated for leagues 41 and 42)
2. Builds the team → league mapping automatically
3. Diffs against the previous season and logs all movements
4. Outputs a summary for human review before applying

This script should be run once in late July / early August, reviewed by a human, and then applied. It's a good candidate for a scheduled task or CI job.

### Data considerations

- **Historical comparisons** — when a team changes league, their previous season was in a different division. The historical fixtures endpoint already takes a season parameter, so this works naturally. However, the comparison may be less meaningful (e.g. comparing a League Two season against a League One season).
- **Standings** — are shared per league, so one API call serves all teams in that league. Promotion/relegation doesn't affect this; each team simply points to the correct league ID.
- **Player stats** — the league filter on the `/players` endpoint ensures we always get the correct competition's stats, regardless of which league the team is in.

---

## Troubleshooting

### Squad Stats showing wrong data (0 goals, 1 appearance for everyone)

**Cause:** The `/players` API call is missing the `league` parameter, so it returns stats for all competitions. The adapter then picks the first entry, which is often a cup competition.

**Fix:** Ensure `getPlayerStats()` in `api-football.ts` passes `league: LEAGUE_ID` in its params. The adapter also has a defensive fallback that matches on `LEAGUE_ID`. (Fixed in v1.25.)

### League table data is stale / doesn't match BBC or Sky

**Cause:** API-Football updates standings hourly on match days. Combined with our caching layers, data can be up to ~75 minutes behind.

**Fix:** The virtual live table (implemented in v1.23) corrects the standings client-side using fixture results. If it's still wrong, check that the `/api/league-fixtures` endpoint is returning current data.

### API returning empty data for the new season

**Cause:** API-Football doesn't populate new season data until pre-season fixtures begin (late July / early August).

**Fix:** Wait. Don't update the `SEASON` env var until you've confirmed data is available (see Step 1 of the end-of-season checklist above).

### Build failures after updating env vars

**Cause:** TypeScript expects the env vars to be strings. If a value is missing or malformed, the defaults in `api-football.ts` will kick in — but they may point to the wrong season/league.

**Fix:** Always update both `.env.local` and Vercel env vars. Double-check there are no typos. Run `npx tsc --noEmit` locally before deploying.

### Historical comparison chart is empty

**Cause:** The `PREVIOUS_SEASON` is derived automatically from `NEXT_PUBLIC_SEASON` (current minus 1). If this env var isn't set, the default kicks in.

**Fix:** Ensure `NEXT_PUBLIC_SEASON` matches `SEASON` in both `.env.local` and Vercel.
