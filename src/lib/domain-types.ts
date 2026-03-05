/**
 * DashboardFC — Canonical Domain Types
 *
 * These types define what the dashboard works with.
 * They are provider-agnostic: no dependency on API-Football
 * or any other data source.
 *
 * To add a new data provider, create an adapter that transforms
 * the provider's response into these types.
 * See: adapters/api-football-adapter.ts for an example.
 */

// ─── Shared ────────────────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  logo: string;
}

// ─── Standings ─────────────────────────────────────────────

export interface StandingEntry {
  rank: number;
  team: Team;
  points: number;
  goalsDiff: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  homeRecord: { w: number; d: number; l: number };
  awayRecord: { w: number; d: number; l: number };
}

export interface StandingsResponse {
  leagueName: string;
  team: StandingEntry | null;
  table: StandingEntry[];
}

// ─── Fixtures ──────────────────────────────────────────────

export interface Fixture {
  id: number;
  date: string;
  status: string;
  venueName: string | null;
  leagueRound: string;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number | null;
  awayGoals: number | null;
  halftimeHome: number | null;
  halftimeAway: number | null;
}

// ─── Match Stats ──────────────────────────────────────────

export interface MatchStats {
  possession: { home: string | null; away: string | null };
  shotsOnGoal: { home: number | null; away: number | null };
  totalShots: { home: number | null; away: number | null };
  cornerKicks: { home: number | null; away: number | null };
  fouls: { home: number | null; away: number | null };
  yellowCards: { home: number | null; away: number | null };
  redCards: { home: number | null; away: number | null };
}

// ─── Player Stats ─────────────────────────────────────────

export interface PlayerStats {
  id: number;
  name: string;
  photo: string;
  position: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: string | null;
  minutes: number;
}

// ─── Match Events ──────────────────────────────────────────

export interface FixtureEvent {
  minute: number;
  teamId: number;
  playerName: string;
  type: string;
  detail: string;
  assistName: string | null;
}
