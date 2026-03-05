"use client";

import { useEffect, useState } from "react";
import { StandingEntry, Fixture, FixtureEvent } from "@/lib/types";

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

function resultFor(fixture: Fixture, teamId: number): "W" | "D" | "L" | null {
  if (fixture.fixture.status.short !== "FT") return null;
  const isHome = fixture.teams.home.id === teamId;
  const teamGoals = isHome ? fixture.goals.home : fixture.goals.away;
  const oppGoals = isHome ? fixture.goals.away : fixture.goals.home;
  if (teamGoals === null || oppGoals === null) return null;
  if (teamGoals > oppGoals) return "W";
  if (teamGoals < oppGoals) return "L";
  return "D";
}

const TEAM_ID = 1334;

// ─── Components ────────────────────────────────────────────

function ResultBadge({ result }: { result: "W" | "D" | "L" | null }) {
  if (!result) return null;
  const colors = {
    W: "bg-win text-white",
    D: "bg-draw text-white",
    L: "bg-loss text-white",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${colors[result]}`}
    >
      {result}
    </span>
  );
}

function PositionBadge({ rank }: { rank: number }) {
  let color = "text-slate-600";
  if (rank <= 3) color = "text-win";
  else if (rank <= 7) color = "text-blue-500";
  else if (rank >= 21) color = "text-loss";
  return <span className={`text-5xl font-bold ${color}`}>{rank}</span>;
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}
    >
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
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
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-2/3" />
      </div>
    </Card>
  );
}

// ─── Dashboard ─────────────────────────────────────────────

export default function Dashboard() {
  const [standings, setStandings] = useState<{
    team: StandingEntry;
    leagueName: string;
  } | null>(null);
  const [lastFixtures, setLastFixtures] = useState<Fixture[]>([]);
  const [nextFixtures, setNextFixtures] = useState<Fixture[]>([]);
  const [lastMatchEvents, setLastMatchEvents] = useState<FixtureEvent[]>([]);
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

        const standingsData = await standingsRes.json();
        const lastData = await lastRes.json();
        const nextData = await nextRes.json();

        setStandings(standingsData);
        setLastFixtures(lastData);
        setNextFixtures(nextData);
        setLastUpdated(new Date());

        // Fetch events for the most recent completed fixture
        if (lastData.length > 0) {
          const lastMatch = lastData[lastData.length - 1];
          const eventsRes = await fetch(
            `/api/fixture-stats?id=${lastMatch.fixture.id}`
          );
          const eventsData = await eventsRes.json();
          setLastMatchEvents(eventsData.events || []);
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-red-800 font-semibold text-lg mb-2">
            Unable to load dashboard
          </h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const team = standings?.team;
  const lastMatch = lastFixtures.length > 0 ? lastFixtures[lastFixtures.length - 1] : null;
  const nextMatch = nextFixtures.length > 0 ? nextFixtures[0] : null;

  // Form from last 6 results
  const recentForm = lastFixtures
    .slice(-6)
    .map((f) => ({
      fixture: f,
      result: resultFor(f, TEAM_ID),
    }));

  // Points per game
  const ppg = team ? (team.points / team.all.played).toFixed(2) : "-";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="bg-brfc-blue text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {team && (
              <img
                src={team.team.logo}
                alt="Bristol Rovers"
                className="w-14 h-14"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">Bristol Rovers FC</h1>
              <p className="text-blue-200 text-sm">
                {standings?.leagueName || "League Two"} — 2025/26 Season
              </p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-blue-300 text-xs mt-2">
              Updated {lastUpdated.toLocaleTimeString("en-GB")}
            </p>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Row 1: Position + Form + PPG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* League Position */}
          {loading ? (
            <LoadingCard title="League Position" />
          ) : team ? (
            <Card title="League Position">
              <div className="flex items-center gap-4">
                <PositionBadge rank={team.rank} />
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {team.points}
                    </span>{" "}
                    points
                  </p>
                  <p>
                    P{team.all.played} W{team.all.win} D{team.all.draw} L
                    {team.all.lose}
                  </p>
                  <p>
                    GD{" "}
                    <span
                      className={
                        team.goalsDiff > 0
                          ? "text-win font-semibold"
                          : team.goalsDiff < 0
                          ? "text-loss font-semibold"
                          : ""
                      }
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
            <Card title="Recent Form">
              <div className="flex gap-2 mb-3">
                {recentForm.map((f, i) => (
                  <ResultBadge key={i} result={f.result} />
                ))}
              </div>
              <div className="space-y-1">
                {recentForm.map((f, i) => {
                  const isHome = f.fixture.teams.home.id === TEAM_ID;
                  const opponent = isHome
                    ? f.fixture.teams.away.name
                    : f.fixture.teams.home.name;
                  return (
                    <p key={i} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {f.fixture.goals.home}-{f.fixture.goals.away}
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
            <Card title="Points Per Game">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-brfc-blue">{ppg}</span>
                <span className="text-sm text-slate-500">pts/game</span>
              </div>
              {team && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400">Home</span>
                    <span className="font-semibold text-slate-800">
                      {team.home.win}W {team.home.draw}D {team.home.lose}L
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Away</span>
                    <span className="font-semibold text-slate-800">
                      {team.away.win}W {team.away.draw}D {team.away.lose}L
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
            <Card title="Last Match">
              <div className="text-xs text-slate-400 mb-2">
                {formatDate(lastMatch.fixture.date)} •{" "}
                {lastMatch.league.round}
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img
                    src={lastMatch.teams.home.logo}
                    alt={lastMatch.teams.home.name}
                    className="w-8 h-8"
                  />
                  <span
                    className={`text-sm font-medium ${
                      lastMatch.teams.home.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : ""
                    }`}
                  >
                    {lastMatch.teams.home.name}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold">
                    {lastMatch.goals.home} - {lastMatch.goals.away}
                  </span>
                  {lastMatch.score.halftime.home !== null && (
                    <p className="text-xs text-slate-400">
                      HT {lastMatch.score.halftime.home}-
                      {lastMatch.score.halftime.away}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      lastMatch.teams.away.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : ""
                    }`}
                  >
                    {lastMatch.teams.away.name}
                  </span>
                  <img
                    src={lastMatch.teams.away.logo}
                    alt={lastMatch.teams.away.name}
                    className="w-8 h-8"
                  />
                </div>
              </div>
              <ResultBadge result={resultFor(lastMatch, TEAM_ID)} />
              {/* Goal events */}
              {lastMatchEvents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {lastMatchEvents
                    .filter((e) => e.type === "Goal")
                    .map((e, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        <span className="font-medium">⚽ {e.player.name}</span>{" "}
                        {e.time.elapsed}&apos;
                        {e.detail !== "Normal Goal" && (
                          <span className="text-slate-400">
                            {" "}
                            ({e.detail})
                          </span>
                        )}
                      </p>
                    ))}
                </div>
              )}
            </Card>
          ) : (
            <Card title="Last Match">
              <p className="text-slate-400 text-sm">No recent match data</p>
            </Card>
          )}

          {/* Next Fixture */}
          {loading ? (
            <LoadingCard title="Next Match" />
          ) : nextMatch ? (
            <Card title="Next Match">
              <div className="text-xs text-slate-400 mb-2">
                {formatDate(nextMatch.fixture.date)} •{" "}
                {formatTime(nextMatch.fixture.date)} •{" "}
                {nextMatch.league.round}
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img
                    src={nextMatch.teams.home.logo}
                    alt={nextMatch.teams.home.name}
                    className="w-8 h-8"
                  />
                  <span
                    className={`text-sm font-medium ${
                      nextMatch.teams.home.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : ""
                    }`}
                  >
                    {nextMatch.teams.home.name}
                  </span>
                </div>
                <div className="text-sm text-slate-400">vs</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      nextMatch.teams.away.id === TEAM_ID
                        ? "text-brfc-blue font-bold"
                        : ""
                    }`}
                  >
                    {nextMatch.teams.away.name}
                  </span>
                  <img
                    src={nextMatch.teams.away.logo}
                    alt={nextMatch.teams.away.name}
                    className="w-8 h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-brfc-blue-light text-brfc-blue text-xs font-semibold">
                  {daysUntil(nextMatch.fixture.date)}
                </span>
                <span className="text-xs text-slate-400">
                  {nextMatch.fixture.venue.name}
                </span>
              </div>
            </Card>
          ) : (
            <Card title="Next Match">
              <p className="text-slate-400 text-sm">No upcoming fixtures</p>
            </Card>
          )}
        </div>

        {/* Row 3: Season Goals Overview (placeholder for Phase 3 charts) */}
        {!loading && team && (
          <Card title="Season Overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-win">
                  {team.all.goals.for}
                </p>
                <p className="text-xs text-slate-500 mt-1">Goals Scored</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-loss">
                  {team.all.goals.against}
                </p>
                <p className="text-xs text-slate-500 mt-1">Goals Conceded</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">
                  {team.all.played}
                </p>
                <p className="text-xs text-slate-500 mt-1">Games Played</p>
              </div>
              <div>
                <p
                  className={`text-3xl font-bold ${
                    team.all.win > team.all.lose ? "text-win" : "text-loss"
                  }`}
                >
                  {Math.round((team.all.win / team.all.played) * 100)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">Win Rate</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              📊 Trend charts coming in Phase 3
            </p>
          </Card>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        <p>
          BRFC Dashboard • Data from{" "}
          <a
            href="https://www.api-football.com"
            className="underline hover:text-slate-600"
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
