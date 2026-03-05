"use client";

import { useEffect, useState } from "react";
import type {
  StandingEntry,
  StandingsResponse,
  Fixture,
  FixtureEvent,
  MatchStats,
} from "@/lib/domain-types";

// ─── Helpers ───────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function resultFor(
  fixture: Fixture,
  teamId: number
): "W" | "D" | "L" | null {
  if (fixture.status !== "FT") return null;
  const isHome = fixture.homeTeam.id === teamId;
  const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
  const oppGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
  if (teamGoals === null || oppGoals === null) return null;
  if (teamGoals > oppGoals) return "W";
  if (teamGoals < oppGoals) return "L";
  return "D";
}

const TEAM_ID = 1334;

// ─── Components ────────────────────────────────────────────

function ResultBadge({
  result,
  delay = 0,
}: {
  result: "W" | "D" | "L" | null;
  delay?: number;
}) {
  if (!result) return null;
  const styles = {
    W: "bg-win text-white shadow-sm shadow-win/30",
    D: "bg-draw text-white shadow-sm shadow-draw/30",
    L: "bg-loss text-white shadow-sm shadow-loss/30",
  };
  return (
    <span
      className={`badge-animate inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${styles[result]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {result}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function PositionBadge({ rank }: { rank: number }) {
  let color = "text-slate-600";
  let bg = "bg-slate-100";
  if (rank <= 3) {
    color = "text-win";
    bg = "bg-win-light";
  } else if (rank <= 7) {
    color = "text-blue-600";
    bg = "bg-blue-50";
  } else if (rank >= 21) {
    color = "text-loss";
    bg = "bg-loss-light";
  }
  return (
    <div
      className={`stat-animate inline-flex items-center justify-center w-20 h-20 rounded-2xl ${bg}`}
    >
      <span className={`text-3xl font-extrabold ${color}`}>
        {ordinal(rank)}
      </span>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-hover bg-card-bg rounded-2xl shadow-sm border border-card-border overflow-hidden ${className}`}
    >
      <div className="px-5 py-3 border-b border-card-border bg-card-header flex items-center gap-2">
        {accent && (
          <span className="w-1 h-4 rounded-full bg-brfc-gold inline-block" />
        )}
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card title={title}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded-full w-3/4" />
        <div className="h-4 bg-slate-200 rounded-full w-1/2" />
        <div className="h-4 bg-slate-200 rounded-full w-2/3" />
      </div>
    </Card>
  );
}

function StatBox({
  value,
  label,
  color = "text-slate-800",
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className={`stat-animate text-3xl font-extrabold ${color}`}>
        {value}
      </p>
      <p className="text-xs text-muted mt-1 font-medium">{label}</p>
    </div>
  );
}

function StatBar({
  label,
  home,
  away,
}: {
  label: string;
  home: string | number | null;
  away: string | number | null;
}) {
  if (home === null && away === null) return null;
  const homeStr = String(home ?? "-");
  const awayStr = String(away ?? "-");

  // Parse numeric values for the bar width
  const homeNum = parseFloat(homeStr) || 0;
  const awayNum = parseFloat(awayStr) || 0;
  const total = homeNum + awayNum || 1;
  const homePct = Math.round((homeNum / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-700">{homeStr}</span>
        <span className="text-muted font-medium">{label}</span>
        <span className="font-semibold text-slate-700">{awayStr}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
        <div
          className="bg-brfc-blue rounded-full transition-all duration-500"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-slate-300 rounded-full transition-all duration-500"
          style={{ width: `${100 - homePct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────

export default function Dashboard() {
  const [standings, setStandings] = useState<StandingsResponse | null>(null);
  const [lastFixtures, setLastFixtures] = useState<Fixture[]>([]);
  const [nextFixtures, setNextFixtures] = useState<Fixture[]>([]);
  const [lastMatchEvents, setLastMatchEvents] = useState<FixtureEvent[]>([]);
  const [lastMatchStats, setLastMatchStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [standingsRes, lastRes, nextRes] = await Promise.all([
          fetch("/api/standings"),
          fetch("/api/fixtures?type=last&count=10"),
          fetch("/api/fixtures?type=next&count=3"),
        ]);

        const standingsData: StandingsResponse = await standingsRes.json();
        const lastData: Fixture[] = await lastRes.json();
        const nextData: Fixture[] = await nextRes.json();

        setStandings(standingsData);
        setLastFixtures(lastData);
        setNextFixtures(nextData);
        setLastUpdated(new Date());

        // Fetch events for the most recent completed fixture
        if (lastData.length > 0) {
          const lastMatch = lastData[lastData.length - 1];
          const eventsRes = await fetch(
            `/api/fixture-stats?id=${lastMatch.id}`
          );
          const eventsData = await eventsRes.json();
          setLastMatchEvents(eventsData.events || []);
          setLastMatchStats(eventsData.stats || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-loss-light border border-red-200 rounded-2xl p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-loss/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-loss text-xl">!</span>
          </div>
          <h2 className="text-red-800 font-semibold text-lg mb-2">
            Unable to load dashboard
          </h2>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-brfc-blue text-white rounded-xl text-sm font-medium hover:bg-brfc-blue-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const team: StandingEntry | null = standings?.team ?? null;
  const lastMatch =
    lastFixtures.length > 0 ? lastFixtures[lastFixtures.length - 1] : null;
  const nextMatch = nextFixtures.length > 0 ? nextFixtures[0] : null;

  // Form from last 6 results
  const recentForm = lastFixtures.slice(-6).map((f) => ({
    fixture: f,
    result: resultFor(f, TEAM_ID),
  }));

  // Points per game
  const ppg = team ? (team.points / team.played).toFixed(2) : "-";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="header-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-5">
            {team && (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 backdrop-blur-sm flex-shrink-0">
                <img
                  src={team.team.logo}
                  alt="Bristol Rovers"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight truncate">
                Bristol Rovers FC
              </h1>
              <p className="text-blue-200 text-xs sm:text-sm mt-0.5">
                {standings?.leagueName || "League Two"} — 2025/26 Season
              </p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-blue-300/70 text-xs mt-4">
              Last updated {lastUpdated.toLocaleTimeString("en-GB")}
            </p>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Row 1: Position + Form + PPG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* League Position */}
          {loading ? (
            <LoadingCard title="League Position" />
          ) : team ? (
            <Card title="League Position" accent>
              <div className="flex items-center gap-5">
                <PositionBadge rank={team.rank} />
                <div className="text-sm text-slate-600 space-y-1.5">
                  <p>
                    <span className="font-bold text-slate-900 text-lg">
                      {team.points}
                    </span>{" "}
                    <span className="text-muted">pts</span>
                  </p>
                  <p className="text-xs text-muted">
                    P{team.played} &nbsp;W{team.wins} &nbsp;D
                    {team.draws} &nbsp;L{team.losses}
                  </p>
                  <p className="text-xs">
                    GD{" "}
                    <span
                      className={`font-bold ${
                        team.goalsDiff > 0
                          ? "text-win"
                          : team.goalsDiff < 0
                          ? "text-loss"
                          : "text-muted"
                      }`}
                    >
                      {team.goalsDiff > 0 ? "+" : ""}
                      {team.goalsDiff}
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <LoadingCard title="League Position" />
          )}

          {/* Recent Form */}
          {loading ? (
            <LoadingCard title="Recent Form" />
          ) : (
            <Card title="Recent Form" accent>
              <div className="flex gap-2 mb-4">
                {recentForm.map((f, i) => (
                  <ResultBadge key={i} result={f.result} delay={i * 80} />
                ))}
              </div>
              <div className="space-y-1.5">
                {recentForm.map((f, i) => {
                  const isHome = f.fixture.homeTeam.id === TEAM_ID;
                  const opponent = isHome
                    ? f.fixture.awayTeam.name
                    : f.fixture.homeTeam.name;
                  return (
                    <p key={i} className="text-xs text-muted">
                      <span className="font-semibold text-slate-700">
                        {f.fixture.homeGoals}–{f.fixture.awayGoals}
                      </span>{" "}
                      {isHome ? "vs" : "@"} {opponent}
                    </p>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Points Per Game */}
          {loading ? (
            <LoadingCard title="Points Per Game" />
          ) : (
            <Card title="Points Per Game" accent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="stat-animate text-5xl font-extrabold text-brfc-blue">
                  {ppg}
                </span>
                <span className="text-sm text-muted font-medium">
                  pts/game
                </span>
              </div>
              {team && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="block text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">
                      Home
                    </span>
                    <span className="font-bold text-sm text-slate-800">
                      {team.homeRecord.w}W {team.homeRecord.d}D{" "}
                      {team.homeRecord.l}L
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <span className="block text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">
                      Away
                    </span>
                    <span className="font-bold text-sm text-slate-800">
                      {team.awayRecord.w}W {team.awayRecord.d}D{" "}
                      {team.awayRecord.l}L
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Row 2: Last Match + Next Match */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last Fixture */}
          {loading ? (
            <LoadingCard title="Last Match" />
          ) : lastMatch ? (
            <Card title="Last Match" accent>
              <div className="text-xs text-muted mb-3 font-medium">
                {formatDate(lastMatch.date)} &middot;{" "}
                {lastMatch.leagueRound}
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={lastMatch.homeTeam.logo}
                      alt={lastMatch.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium leading-tight truncate ${
                      lastMatch.homeTeam.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {lastMatch.homeTeam.name}
                  </span>
                </div>
                <div className="text-center px-4">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {lastMatch.homeGoals} – {lastMatch.awayGoals}
                  </span>
                  {lastMatch.halftimeHome !== null && (
                    <p className="text-[10px] text-muted mt-0.5 font-medium">
                      HT {lastMatch.halftimeHome}–{lastMatch.halftimeAway}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span
                    className={`text-xs sm:text-sm font-medium text-right leading-tight truncate ${
                      lastMatch.awayTeam.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {lastMatch.awayTeam.name}
                  </span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={lastMatch.awayTeam.logo}
                      alt={lastMatch.awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
              {/* Goal events split by team */}
              {lastMatchEvents.filter((e) => e.type === "Goal").length > 0 && (
                <div className="mt-4 pt-4 border-t border-card-border">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Home team goals */}
                    <div className="space-y-1.5">
                      {lastMatchEvents
                        .filter(
                          (e) =>
                            e.type === "Goal" &&
                            e.teamId === lastMatch.homeTeam.id
                        )
                        .map((e, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            <span className="font-semibold">
                              {e.playerName}
                            </span>{" "}
                            <span className="text-muted">
                              {e.minute}&apos;
                            </span>
                            {e.detail !== "Normal Goal" && (
                              <span className="text-muted ml-1">
                                ({e.detail})
                              </span>
                            )}
                          </p>
                        ))}
                    </div>
                    {/* Away team goals */}
                    <div className="space-y-1.5 text-right">
                      {lastMatchEvents
                        .filter(
                          (e) =>
                            e.type === "Goal" &&
                            e.teamId === lastMatch.awayTeam.id
                        )
                        .map((e, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            <span className="font-semibold">
                              {e.playerName}
                            </span>{" "}
                            <span className="text-muted">
                              {e.minute}&apos;
                            </span>
                            {e.detail !== "Normal Goal" && (
                              <span className="text-muted ml-1">
                                ({e.detail})
                              </span>
                            )}
                          </p>
                        ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Match stats */}
              {lastMatchStats && (
                <div className="mt-4 pt-4 border-t border-card-border space-y-2.5">
                  <StatBar
                    label="Possession"
                    home={lastMatchStats.possession.home}
                    away={lastMatchStats.possession.away}
                  />
                  <StatBar
                    label="Shots on Target"
                    home={lastMatchStats.shotsOnGoal.home}
                    away={lastMatchStats.shotsOnGoal.away}
                  />
                  <StatBar
                    label="Total Shots"
                    home={lastMatchStats.totalShots.home}
                    away={lastMatchStats.totalShots.away}
                  />
                  <StatBar
                    label="Corners"
                    home={lastMatchStats.cornerKicks.home}
                    away={lastMatchStats.cornerKicks.away}
                  />
                  <StatBar
                    label="Fouls"
                    home={lastMatchStats.fouls.home}
                    away={lastMatchStats.fouls.away}
                  />
                </div>
              )}
            </Card>
          ) : (
            <Card title="Last Match">
              <p className="text-muted text-sm">No recent match data</p>
            </Card>
          )}

          {/* Next Fixture */}
          {loading ? (
            <LoadingCard title="Next Match" />
          ) : nextMatch ? (
            <Card title="Next Match" accent>
              <div className="text-xs text-muted mb-3 font-medium">
                {formatDate(nextMatch.date)} &middot;{" "}
                {formatTime(nextMatch.date)} &middot;{" "}
                {nextMatch.leagueRound}
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={nextMatch.homeTeam.logo}
                      alt={nextMatch.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium leading-tight truncate ${
                      nextMatch.homeTeam.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {nextMatch.homeTeam.name}
                  </span>
                </div>
                <div className="text-center px-4">
                  <span className="text-2xl font-bold text-muted">vs</span>
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span
                    className={`text-xs sm:text-sm font-medium text-right leading-tight truncate ${
                      nextMatch.awayTeam.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : "text-slate-700"
                    }`}
                  >
                    {nextMatch.awayTeam.name}
                  </span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={nextMatch.awayTeam.logo}
                      alt={nextMatch.awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-brfc-blue text-white text-xs font-bold shadow-sm shadow-brfc-blue/20">
                  {daysUntil(nextMatch.date)}
                </span>
                <span className="text-xs text-muted">
                  {nextMatch.venueName}
                </span>
              </div>
            </Card>
          ) : (
            <Card title="Next Match">
              <p className="text-muted text-sm">No upcoming fixtures</p>
            </Card>
          )}
        </div>

        {/* Row 3: Season Overview */}
        {!loading && team && (
          <Card title="Season Overview" accent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBox
                value={team.goalsFor}
                label="Goals Scored"
                color="text-win"
              />
              <StatBox
                value={team.goalsAgainst}
                label="Goals Conceded"
                color="text-loss"
              />
              <StatBox value={team.played} label="Games Played" />
              <StatBox
                value={`${Math.round(
                  (team.wins / team.played) * 100
                )}%`}
                label="Win Rate"
                color={team.wins > team.losses ? "text-win" : "text-loss"}
              />
            </div>
          </Card>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-xs text-muted">
          <span className="font-semibold text-brfc-gold">DashboardFC</span>{" "}
          <span className="text-subtle">v1.2</span>
          <span className="mx-2 text-subtle">&middot;</span>
          Data from{" "}
          <a
            href="https://www.api-football.com"
            className="underline hover:text-slate-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            API-Football
          </a>
        </p>
      </footer>
    </div>
  );
}
