/**
 * API-Football Adapter
 *
 * Transforms raw API-Football responses into DashboardFC domain types.
 * This is the only file that knows about API-Football's data shape.
 *
 * To switch providers, create a new adapter file (e.g. statsbomb-adapter.ts)
 * that exports the same three functions with the same return types.
 */

import type {
  StandingEntry,
  StandingsResponse,
  Fixture,
  FixtureEvent,
  MatchStats,
  PlayerStats,
} from "@/lib/domain-types";
import { LEAGUE_ID } from "@/lib/api-football";

// ─── Standings ─────────────────────────────────────────────

/**
 * Transform the raw standings API response into domain StandingsResponse.
 *
 * Input shape (from API-Football):
 *   { table: [...], team: { rank, team, points, goalsDiff, all, home, away, ... }, leagueName }
 *
 * The "team" field is the pre-filtered entry for our team.
 * The "table" contains all teams in the league.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformStandings(raw: any): StandingsResponse {
  if (!raw) {
    return { leagueName: "League", team: null, table: [] };
  }

  return {
    leagueName: raw.leagueName || "League",
    team: raw.team ? transformStandingEntry(raw.team) : null,
    table: Array.isArray(raw.table)
      ? raw.table.map(transformStandingEntry)
      : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStandingEntry(entry: any): StandingEntry {
  return {
    rank: entry.rank,
    team: {
      id: entry.team.id,
      name: entry.team.name,
      logo: entry.team.logo,
    },
    points: entry.points,
    goalsDiff: entry.goalsDiff,
    played: entry.all.played,
    wins: entry.all.win,
    draws: entry.all.draw,
    losses: entry.all.lose,
    goalsFor: entry.all.goals.for,
    goalsAgainst: entry.all.goals.against,
    form: entry.form || "",
    homeRecord: {
      w: entry.home.win,
      d: entry.home.draw,
      l: entry.home.lose,
      gf: entry.home.goals.for,
      ga: entry.home.goals.against,
    },
    awayRecord: {
      w: entry.away.win,
      d: entry.away.draw,
      l: entry.away.lose,
      gf: entry.away.goals.for,
      ga: entry.away.goals.against,
    },
  };
}

// ─── Fixtures ──────────────────────────────────────────────

/**
 * Transform an array of raw API-Football fixture objects into domain Fixtures.
 *
 * Input shape (from API-Football):
 *   { fixture: { id, date, status, venue }, league: { round }, teams: { home, away }, goals, score }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformFixtures(rawFixtures: any[]): Fixture[] {
  if (!Array.isArray(rawFixtures)) return [];
  return rawFixtures.map(transformFixture);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFixture(f: any): Fixture {
  return {
    id: f.fixture.id,
    date: f.fixture.date,
    status: f.fixture.status.short,
    venueName: f.fixture.venue?.name ?? null,
    leagueRound: f.league.round,
    homeTeam: {
      id: f.teams.home.id,
      name: f.teams.home.name,
      logo: f.teams.home.logo,
    },
    awayTeam: {
      id: f.teams.away.id,
      name: f.teams.away.name,
      logo: f.teams.away.logo,
    },
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
    halftimeHome: f.score.halftime.home,
    halftimeAway: f.score.halftime.away,
  };
}

// ─── Match Stats ──────────────────────────────────────────

/**
 * Transform raw API-Football statistics into domain MatchStats.
 *
 * Input shape (from API-Football):
 *   [ { team: {...}, statistics: [ { type: "Ball Possession", value: "52%" }, ... ] },
 *     { team: {...}, statistics: [ ... ] } ]
 *
 * Index 0 = home team, Index 1 = away team
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformMatchStats(rawStats: any[]): MatchStats | null {
  if (!Array.isArray(rawStats) || rawStats.length < 2) return null;

  const home = rawStats[0]?.statistics;
  const away = rawStats[1]?.statistics;
  if (!home || !away) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function findStat(stats: any[], type: string): any {
    return stats.find((s: { type: string }) => s.type === type)?.value ?? null;
  }

  return {
    possession: {
      home: findStat(home, "Ball Possession"),
      away: findStat(away, "Ball Possession"),
    },
    shotsOnGoal: {
      home: findStat(home, "Shots on Goal"),
      away: findStat(away, "Shots on Goal"),
    },
    totalShots: {
      home: findStat(home, "Total Shots"),
      away: findStat(away, "Total Shots"),
    },
    cornerKicks: {
      home: findStat(home, "Corner Kicks"),
      away: findStat(away, "Corner Kicks"),
    },
    fouls: {
      home: findStat(home, "Fouls"),
      away: findStat(away, "Fouls"),
    },
    yellowCards: {
      home: findStat(home, "Yellow Cards"),
      away: findStat(away, "Yellow Cards"),
    },
    redCards: {
      home: findStat(home, "Red Cards"),
      away: findStat(away, "Red Cards"),
    },
  };
}

// ─── Player Stats ─────────────────────────────────────────

/**
 * Transform raw API-Football player data into domain PlayerStats.
 *
 * Input shape (from API-Football /players):
 *   { player: { id, name, photo }, statistics: [ { league: { id, name }, games: { ... }, goals: { ... }, cards: { ... } } ] }
 *
 * The statistics array can contain one entry per competition. We pick the
 * entry matching our configured LEAGUE_ID first, then fall back to the
 * entry with the most appearances, then to index 0 as a last resort.
 * The API call already filters by league, but this defensive approach
 * handles edge cases — and adapts automatically if the club changes division.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformPlayerStats(rawPlayers: any[]): PlayerStats[] {
  if (!Array.isArray(rawPlayers)) return [];

  const targetLeagueId = parseInt(LEAGUE_ID, 10);

  return rawPlayers
    .map((entry) => {
      const player = entry.player;
      const allStats = entry.statistics;
      if (!player || !Array.isArray(allStats) || allStats.length === 0)
        return null;

      // Prefer the league stats entry; fall back to most appearances; then [0]
      const stats =
        allStats.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.league?.id === targetLeagueId
        ) ??
        allStats.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (best: any, s: any) =>
            (s.games?.appearences ?? 0) > (best.games?.appearences ?? 0)
              ? s
              : best,
          allStats[0]
        );

      return {
        id: player.id,
        name: player.name,
        photo: player.photo,
        position: stats.games?.position || "Unknown",
        appearances: stats.games?.appearences ?? 0,
        goals: stats.goals?.total ?? 0,
        assists: stats.goals?.assists ?? 0,
        yellowCards: stats.cards?.yellow ?? 0,
        redCards: stats.cards?.red ?? 0,
        rating: stats.games?.rating ?? null,
        minutes: stats.games?.minutes ?? 0,
      };
    })
    .filter((p): p is PlayerStats => p !== null);
}

// ─── Match Events ──────────────────────────────────────────

/**
 * Transform raw API-Football event objects into domain FixtureEvents.
 *
 * Input shape (from API-Football):
 *   { time: { elapsed }, team: { id }, player: { name }, assist: { name }, type, detail }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformEvents(rawEvents: any[]): FixtureEvent[] {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map((e) => ({
    minute: e.time.elapsed,
    teamId: e.team.id,
    playerName: e.player.name,
    type: e.type,
    detail: e.detail,
    assistName: e.assist?.name ?? null,
  }));
}
