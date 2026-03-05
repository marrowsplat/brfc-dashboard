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
} from "@/lib/domain-types";

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
    homeRecord: {
      w: entry.home.win,
      d: entry.home.draw,
      l: entry.home.lose,
    },
    awayRecord: {
      w: entry.away.win,
      d: entry.away.draw,
      l: entry.away.lose,
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
