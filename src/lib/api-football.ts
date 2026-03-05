/**
 * API-Football client with in-memory caching.
 *
 * All calls to the external API go through this module.
 * The cache keeps us well within the free tier (100 req/day).
 *
 * FREE TIER NOTES:
 * - "last" and "next" fixture params are Pro-only
 * - Current season (2025) is Pro-only — use 2024 for testing
 * - We work around this by fetching the full season and filtering
 */

const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY || "";

// --- In-memory cache ---
interface CacheEntry {
  data: unknown;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchWithCache(
  endpoint: string,
  params: Record<string, string>,
  cacheDurationMs: number
): Promise<unknown> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // Check for API-level errors (e.g. plan restrictions)
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.warn("API-Football warning:", json.errors);
  }

  cache.set(cacheKey, { data: json, expiry: Date.now() + cacheDurationMs });
  return json;
}

// --- Cache durations ---
const HOURS = (n: number) => n * 60 * 60 * 1000;

// --- Public API ---

const TEAM_ID = process.env.TEAM_ID || "1334";
const LEAGUE_ID = process.env.LEAGUE_ID || "41";
const SEASON = process.env.SEASON || "2024";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FixtureResponse = any[];

/** League standings — cached 2 hours */
export async function getStandings() {
  const data = (await fetchWithCache(
    "/standings",
    { league: LEAGUE_ID, season: SEASON },
    HOURS(2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as { response: any[] };

  const standings = data.response?.[0]?.league?.standings?.[0];
  if (!standings) return null;

  // Find our team's position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamEntry = standings.find((entry: any) => {
    return entry.team && String(entry.team.id) === TEAM_ID;
  });

  return {
    table: standings,
    team: teamEntry || null,
    leagueName: data.response?.[0]?.league?.name || "League",
  };
}

/**
 * All season fixtures — cached 2 hours.
 * This is the main data source. We filter from this for
 * "last" and "next" fixtures to avoid Pro-only params.
 */
export async function getSeasonFixtures(): Promise<FixtureResponse> {
  const data = (await fetchWithCache(
    "/fixtures",
    { team: TEAM_ID, league: LEAGUE_ID, season: SEASON },
    HOURS(2)
  )) as { response: FixtureResponse };

  return data.response || [];
}

/** Completed fixtures (most recent last), derived from season fixtures */
export async function getLastFixtures(count = 10): Promise<FixtureResponse> {
  const all = await getSeasonFixtures();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completed = all.filter((f: any) => f.fixture.status.short === "FT");
  return completed.slice(-count);
}

/** Upcoming fixtures, derived from season fixtures */
export async function getNextFixtures(count = 5): Promise<FixtureResponse> {
  const all = await getSeasonFixtures();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcoming = all.filter((f: any) => {
    const status = f.fixture.status.short;
    return status === "NS" || status === "TBD";
  });
  return upcoming.slice(0, count);
}

/** Match statistics for a specific fixture — cached ~30 days */
export async function getFixtureStats(fixtureId: string) {
  const data = (await fetchWithCache(
    "/fixtures/statistics",
    { fixture: fixtureId },
    HOURS(24 * 30)
  )) as { response: unknown[] };

  return data.response || [];
}

/** Match events (goals, cards, subs) — cached ~30 days */
export async function getFixtureEvents(fixtureId: string) {
  const data = (await fetchWithCache(
    "/fixtures/events",
    { fixture: fixtureId },
    HOURS(24 * 30)
  )) as { response: unknown[] };

  return data.response || [];
}
