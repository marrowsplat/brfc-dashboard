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
const MINUTES = (n: number) => n * 60 * 1000;
const HOURS = (n: number) => n * 60 * 60 * 1000;

// --- Public API ---

const TEAM_ID = process.env.TEAM_ID || "1334";
const LEAGUE_ID = process.env.LEAGUE_ID || "41";
const SEASON = process.env.SEASON || "2024";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FixtureResponse = any[];

/**
 * League standings — cached 15 minutes.
 * API-Football updates standings hourly on match days, so 15 min is a
 * good trade-off: max ~75 min staleness while keeping API calls low.
 * Keyed by league (not team) so all team pages share one cached copy.
 */
export async function getStandings() {
  const data = (await fetchWithCache(
    "/standings",
    { league: LEAGUE_ID, season: SEASON },
    MINUTES(15)
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
 * All season fixtures — cached 15 minutes.
 * This is the main data source. We filter from this for
 * "last" and "next" fixtures to avoid Pro-only params.
 */
export async function getSeasonFixtures(): Promise<FixtureResponse> {
  const data = (await fetchWithCache(
    "/fixtures",
    { team: TEAM_ID, league: LEAGUE_ID, season: SEASON },
    MINUTES(15)
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

/**
 * Match events (goals, cards, subs).
 * Strategy: try multiple sources since the free tier is inconsistent.
 * Never cache empty results so we always retry.
 */
export async function getFixtureEvents(fixtureId: string) {
  // 1. Check if the season fixtures (already cached) contain this match with events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonFixtures: any[] = await getSeasonFixtures();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonMatch = seasonFixtures.find((f: any) => String(f.fixture.id) === String(fixtureId));
  if (seasonMatch?.events && seasonMatch.events.length > 0) {
    return seasonMatch.events;
  }

  // 2. Try the dedicated events endpoint
  const eventsUrl = new URL(`${API_BASE}/fixtures/events`);
  eventsUrl.searchParams.set("fixture", fixtureId);
  const eventsCacheKey = eventsUrl.toString();
  const eventsCached = cache.get(eventsCacheKey);

  if (eventsCached && Date.now() < eventsCached.expiry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedResponse = (eventsCached.data as any).response;
    if (cachedResponse && cachedResponse.length > 0) {
      return cachedResponse;
    }
    // Cached but empty — fall through to try the fixture detail endpoint
  } else {
    // Not cached — fetch fresh
    try {
      const res = await fetch(eventsUrl.toString(), {
        headers: { "x-apisports-key": API_KEY },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.response && json.response.length > 0) {
          // Only cache non-empty results
          cache.set(eventsCacheKey, { data: json, expiry: Date.now() + HOURS(24 * 30) });
          return json.response;
        }
      }
    } catch {
      // Silently fall through to next strategy
    }
  }

  // 3. Try fetching the full fixture detail (includes events inline)
  const fixtureUrl = new URL(`${API_BASE}/fixtures`);
  fixtureUrl.searchParams.set("id", fixtureId);
  const fixtureCacheKey = fixtureUrl.toString();
  const fixtureCached = cache.get(fixtureCacheKey);

  if (fixtureCached && Date.now() < fixtureCached.expiry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (fixtureCached.data as any).response?.[0]?.events;
    if (events && events.length > 0) return events;
  } else {
    try {
      const res = await fetch(fixtureUrl.toString(), {
        headers: { "x-apisports-key": API_KEY },
      });
      if (res.ok) {
        const json = await res.json();
        const events = json.response?.[0]?.events;
        if (events && events.length > 0) {
          cache.set(fixtureCacheKey, { data: json, expiry: Date.now() + HOURS(24 * 30) });
          return events;
        }
      }
    } catch {
      // Silently fall through
    }
  }

  return [];
}

/**
 * Player stats for the team this season — cached 6 hours.
 * Uses /players endpoint with team + season params, paginated.
 */
export async function getPlayerStats() {
  // Fetch page 1 first to get paging info
  const page1 = (await fetchWithCache(
    "/players",
    { team: TEAM_ID, season: SEASON, page: "1" },
    HOURS(6)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as { response: any[]; paging: { current: number; total: number } };

  let allPlayers = page1.response || [];

  // Fetch remaining pages if any
  const totalPages = page1.paging?.total || 1;
  for (let p = 2; p <= totalPages; p++) {
    const page = (await fetchWithCache(
      "/players",
      { team: TEAM_ID, season: SEASON, page: String(p) },
      HOURS(6)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as { response: any[] };
    allPlayers = allPlayers.concat(page.response || []);
  }

  return allPlayers;
}

/**
 * Season fixtures for a specific season (for historical comparison).
 * Cached indefinitely (past seasons don't change).
 */
export async function getHistoricalSeasonFixtures(season: string): Promise<FixtureResponse> {
  const data = (await fetchWithCache(
    "/fixtures",
    { team: TEAM_ID, league: LEAGUE_ID, season },
    HOURS(24 * 365) // past season — cache forever
  )) as { response: FixtureResponse };

  return data.response || [];
}
