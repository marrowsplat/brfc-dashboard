"use client";

import { useEffect, useState } from "react";
import type {
  StandingEntry,
  StandingsResponse,
  Fixture,
  FixtureEvent,
  MatchStats,
  PlayerStats,
} from "@/lib/domain-types";
import { PointsChart, GoalsChart, HomeAwayChart } from "./charts";

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

// ─── Form Dots ─────────────────────────────────────────────

function FormDots({ form, size = "sm" }: { form: string; size?: "sm" | "xs" }) {
  if (!form) return null;
  const dotSize = size === "xs" ? "w-2 h-2" : "w-2.5 h-2.5";
  return (
    <div className="flex gap-0.5">
      {form.split("").map((ch, i) => {
        let color = "bg-slate-300";
        if (ch === "W") color = "bg-win";
        else if (ch === "L") color = "bg-loss";
        else if (ch === "D") color = "bg-draw";
        return (
          <span
            key={i}
            className={`${dotSize} rounded-full ${color}`}
            title={ch === "W" ? "Win" : ch === "D" ? "Draw" : ch === "L" ? "Loss" : ch}
          />
        );
      })}
    </div>
  );
}

// ─── Team Name with Form ───────────────────────────────────

function TeamNameWithForm({
  teamId,
  teamName,
  table,
  align = "left",
}: {
  teamId: number;
  teamName: string;
  table: StandingEntry[];
  align?: "left" | "right";
}) {
  const isOurTeam = teamId === TEAM_ID;
  const entry = table.find((e) => e.team.id === teamId);

  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <span
        className={`block text-xs sm:text-sm font-medium leading-tight truncate ${
          isOurTeam ? "text-brfc-blue font-bold" : "text-slate-700"
        }`}
      >
        {teamName}
      </span>
      {entry && (
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            align === "right" ? "justify-end" : ""
          }`}
        >
          <span className="text-[10px] font-bold text-muted bg-slate-100 rounded px-1 py-0.5 leading-none">
            {ordinal(entry.rank)}
          </span>
          <FormDots form={entry.form} size="xs" />
        </div>
      )}
    </div>
  );
}

// ─── League Table ──────────────────────────────────────────

function LeagueTable({
  table,
  teamId,
  nextOpponentId,
}: {
  table: StandingEntry[];
  teamId: number;
  nextOpponentId?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const teamIdx = table.findIndex((e) => e.team.id === teamId);

  // Compact view: show 3 above and 3 below Rovers (7 rows)
  const windowSize = 3;
  const startIdx = Math.max(0, teamIdx - windowSize);
  const endIdx = Math.min(table.length, teamIdx + windowSize + 1);
  const displayTable = expanded ? table : table.slice(startIdx, endIdx);

  // Zone boundaries for League Two
  const promoZone = 3; // auto promotion: 1-3
  const playoffZone = 7; // playoffs: 4-7
  const relegationZone = table.length - 1; // bottom 2: 23-24

  function zoneIndicator(rank: number) {
    if (rank <= promoZone) return "bg-green-500";
    if (rank <= playoffZone) return "bg-amber-400";
    if (rank >= relegationZone) return "bg-red-500";
    return "bg-transparent";
  }

  return (
    <div>
      {/* Show ellipsis at top if compact view doesn't start at rank 1 */}
      {!expanded && startIdx > 0 && (
        <p className="text-xs text-slate-300 text-center mb-1">···</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-slate-100">
              <th className="w-1"></th>
              <th className="text-left py-2 pl-2 font-semibold">#</th>
              <th className="text-left py-2 font-semibold">Team</th>
              <th className="text-center py-2 font-semibold">P</th>
              <th className="text-center py-2 font-semibold">W</th>
              <th className="text-center py-2 font-semibold">D</th>
              <th className="text-center py-2 font-semibold">L</th>
              <th className="text-center py-2 font-semibold hidden sm:table-cell">GF</th>
              <th className="text-center py-2 font-semibold hidden sm:table-cell">GA</th>
              <th className="text-center py-2 font-semibold">GD</th>
              <th className="text-center py-2 font-semibold">Pts</th>
              <th className="text-center py-2 pr-2 font-semibold hidden sm:table-cell">Form</th>
            </tr>
          </thead>
          <tbody>
            {displayTable.map((entry) => {
              const isRovers = entry.team.id === teamId;
              const isNextOpponent = entry.team.id === nextOpponentId;
              let rowBg = "hover:bg-slate-50";
              if (isRovers) rowBg = "bg-brfc-blue/5 font-bold";
              else if (isNextOpponent) rowBg = "bg-brfc-gold/5";

              return (
                <tr
                  key={entry.rank}
                  className={`border-b border-slate-50 transition-colors ${rowBg}`}
                >
                  <td className="w-1 p-0">
                    <div
                      className={`w-1 h-full min-h-[32px] rounded-r-full ${
                        isNextOpponent
                          ? "bg-brfc-gold"
                          : zoneIndicator(entry.rank)
                      }`}
                    />
                  </td>
                  <td className="py-2 pl-2 text-muted">{entry.rank}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={entry.team.logo}
                        alt={entry.team.name}
                        className="w-4 h-4 object-contain"
                      />
                      <span
                        className={`truncate max-w-[100px] sm:max-w-none ${
                          isRovers
                            ? "text-brfc-blue"
                            : isNextOpponent
                            ? "text-brfc-gold font-semibold"
                            : "text-slate-700"
                        }`}
                      >
                        {entry.team.name}
                      </span>
                      {isNextOpponent && (
                        <span className="text-[9px] text-brfc-gold font-bold uppercase tracking-wider">
                          Next
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-center text-muted">
                    {entry.played}
                  </td>
                  <td className="py-2 text-center text-muted">{entry.wins}</td>
                  <td className="py-2 text-center text-muted">
                    {entry.draws}
                  </td>
                  <td className="py-2 text-center text-muted">
                    {entry.losses}
                  </td>
                  <td className="py-2 text-center text-muted hidden sm:table-cell">
                    {entry.goalsFor}
                  </td>
                  <td className="py-2 text-center text-muted hidden sm:table-cell">
                    {entry.goalsAgainst}
                  </td>
                  <td
                    className={`py-2 text-center font-semibold ${
                      entry.goalsDiff > 0
                        ? "text-win"
                        : entry.goalsDiff < 0
                        ? "text-loss"
                        : "text-muted"
                    }`}
                  >
                    {entry.goalsDiff > 0 ? "+" : ""}
                    {entry.goalsDiff}
                  </td>
                  <td
                    className={`py-2 text-center font-bold ${
                      isRovers ? "text-brfc-blue" : "text-slate-800"
                    }`}
                  >
                    {entry.points}
                  </td>
                  <td className="py-2 text-center pr-2 hidden sm:table-cell">
                    <FormDots form={entry.form} size="xs" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Show ellipsis at bottom if compact view doesn't end at last rank */}
      {!expanded && endIdx < table.length && (
        <p className="text-xs text-slate-300 text-center mt-1">···</p>
      )}
      {/* Zone legend + expand toggle */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Promotion
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Playoffs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Relegation
          </span>
          {nextOpponentId && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brfc-gold" /> Next opponent
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-brfc-blue hover:text-brfc-blue-dark font-medium transition-colors"
        >
          {expanded ? "Show less" : "Full table"}
        </button>
      </div>
    </div>
  );
}

// ─── Player Stats Table ────────────────────────────────────

type SortField = "goals" | "assists" | "appearances" | "yellowCards" | "rating";

function PlayerStatsTable({ players }: { players: PlayerStats[] }) {
  const [sortBy, setSortBy] = useState<SortField>("goals");
  const [showAll, setShowAll] = useState(false);

  const sorted = [...players].sort((a, b) => {
    if (sortBy === "rating") {
      return (parseFloat(b.rating ?? "0") || 0) - (parseFloat(a.rating ?? "0") || 0);
    }
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  const display = showAll ? sorted : sorted.slice(0, 10);

  const sortButtons: { field: SortField; label: string }[] = [
    { field: "goals", label: "Goals" },
    { field: "assists", label: "Assists" },
    { field: "appearances", label: "Apps" },
    { field: "yellowCards", label: "Cards" },
    { field: "rating", label: "Rating" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {sortButtons.map((btn) => (
          <button
            key={btn.field}
            onClick={() => setSortBy(btn.field)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortBy === btn.field
                ? "bg-brfc-blue text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-slate-100">
              <th className="text-left py-2 font-semibold">Player</th>
              <th className="text-center py-2 font-semibold">Pos</th>
              <th className="text-center py-2 font-semibold">Apps</th>
              <th className="text-center py-2 font-semibold">⚽</th>
              <th className="text-center py-2 font-semibold">🅰️</th>
              <th className="text-center py-2 font-semibold">🟨</th>
              <th className="text-center py-2 font-semibold">🟥</th>
              <th className="text-center py-2 pr-2 font-semibold">Rtg</th>
            </tr>
          </thead>
          <tbody>
            {display.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-4 text-right">{i + 1}</span>
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="w-6 h-6 rounded-full object-cover bg-slate-100"
                    />
                    <span className="font-medium text-slate-700 truncate max-w-[100px] sm:max-w-[180px]">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="text-center py-2">
                  <span className="text-[10px] text-muted font-medium">
                    {p.position.slice(0, 3).toUpperCase()}
                  </span>
                </td>
                <td className="text-center py-2 text-muted">{p.appearances}</td>
                <td className={`text-center py-2 font-bold ${p.goals > 0 ? "text-win" : "text-muted"}`}>
                  {p.goals}
                </td>
                <td className={`text-center py-2 font-semibold ${p.assists > 0 ? "text-blue-600" : "text-muted"}`}>
                  {p.assists}
                </td>
                <td className={`text-center py-2 ${p.yellowCards > 0 ? "text-amber-500 font-semibold" : "text-muted"}`}>
                  {p.yellowCards}
                </td>
                <td className={`text-center py-2 ${p.redCards > 0 ? "text-loss font-bold" : "text-muted"}`}>
                  {p.redCards}
                </td>
                <td className="text-center py-2 pr-2 text-muted">
                  {p.rating ? parseFloat(p.rating).toFixed(1) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 10 && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-brfc-blue hover:text-brfc-blue-dark font-medium transition-colors"
          >
            {showAll ? "Show top 10" : `View all ${sorted.length} players`}
          </button>
        </div>
      )}
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
  const [seasonFixtures, setSeasonFixtures] = useState<Fixture[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [historicalFixtures, setHistoricalFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [standingsRes, lastRes, nextRes, seasonRes, playersRes, histRes] =
          await Promise.all([
            fetch("/api/standings"),
            fetch("/api/fixtures?type=last&count=10"),
            fetch("/api/fixtures?type=next&count=3"),
            fetch("/api/fixtures?type=season"),
            fetch("/api/players"),
            fetch("/api/historical-fixtures?season=2024"),
          ]);

        const standingsData: StandingsResponse = await standingsRes.json();
        const lastData: Fixture[] = await lastRes.json();
        const nextData: Fixture[] = await nextRes.json();
        const seasonData: Fixture[] = await seasonRes.json();
        const playersData: PlayerStats[] = await playersRes.json();
        const histData: Fixture[] = await histRes.json();

        setStandings(standingsData);
        setLastFixtures(lastData);
        setNextFixtures(nextData);
        setSeasonFixtures(seasonData);
        setPlayerStats(Array.isArray(playersData) ? playersData : []);
        setHistoricalFixtures(Array.isArray(histData) ? histData : []);
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

  // Form stats
  const formPoints = recentForm.reduce((sum, f) => {
    if (f.result === "W") return sum + 3;
    if (f.result === "D") return sum + 1;
    return sum;
  }, 0);
  const formMax = recentForm.length * 3;

  // Unbeaten / winless run from most recent backwards
  let unbeatenRun = 0;
  let winlessRun = 0;
  let cleanSheets = 0;
  const reversed = [...lastFixtures].reverse();
  for (const f of reversed) {
    const r = resultFor(f, TEAM_ID);
    if (r === "W" || r === "D") unbeatenRun++;
    else break;
  }
  for (const f of reversed) {
    const r = resultFor(f, TEAM_ID);
    if (r === "D" || r === "L") winlessRun++;
    else break;
  }
  for (const f of recentForm.map((rf) => rf.fixture)) {
    const isHome = f.homeTeam.id === TEAM_ID;
    const conceded = isHome ? f.awayGoals : f.homeGoals;
    if (conceded === 0) cleanSheets++;
  }

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
              <div className="flex gap-2 mb-3">
                {recentForm.map((f, i) => (
                  <ResultBadge key={i} result={f.result} delay={i * 80} />
                ))}
              </div>
              <div className="flex gap-3 mb-3 text-xs">
                <span className="bg-slate-50 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700">
                  {formPoints}/{formMax} pts
                </span>
                {unbeatenRun >= 3 && (
                  <span className="bg-win-light rounded-lg px-2.5 py-1.5 font-semibold text-win">
                    {unbeatenRun} unbeaten
                  </span>
                )}
                {winlessRun >= 3 && unbeatenRun < 3 && (
                  <span className="bg-loss-light rounded-lg px-2.5 py-1.5 font-semibold text-loss">
                    {winlessRun} without a win
                  </span>
                )}
                {cleanSheets > 0 && (
                  <span className="bg-blue-50 rounded-lg px-2.5 py-1.5 font-semibold text-blue-600">
                    {cleanSheets} clean sheet{cleanSheets !== 1 ? "s" : ""}
                  </span>
                )}
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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={lastMatch.homeTeam.logo}
                      alt={lastMatch.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <TeamNameWithForm
                    teamId={lastMatch.homeTeam.id}
                    teamName={lastMatch.homeTeam.name}
                    table={standings?.table ?? []}
                  />
                </div>
                <div className="text-center px-4 flex-shrink-0">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {lastMatch.homeGoals} – {lastMatch.awayGoals}
                  </span>
                  {lastMatch.halftimeHome !== null && (
                    <p className="text-[10px] text-muted mt-0.5 font-medium">
                      HT {lastMatch.halftimeHome}–{lastMatch.halftimeAway}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                  <TeamNameWithForm
                    teamId={lastMatch.awayTeam.id}
                    teamName={lastMatch.awayTeam.name}
                    table={standings?.table ?? []}
                    align="right"
                  />
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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex-shrink-0">
                    <img
                      src={nextMatch.homeTeam.logo}
                      alt={nextMatch.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <TeamNameWithForm
                    teamId={nextMatch.homeTeam.id}
                    teamName={nextMatch.homeTeam.name}
                    table={standings?.table ?? []}
                  />
                </div>
                <div className="text-center px-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-muted">vs</span>
                </div>
                <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                  <TeamNameWithForm
                    teamId={nextMatch.awayTeam.id}
                    teamName={nextMatch.awayTeam.name}
                    table={standings?.table ?? []}
                    align="right"
                  />
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

        {/* Row 4: League Table */}
        {!loading && standings && standings.table.length > 0 && (
          <Card title="League Table" accent>
            <LeagueTable
              table={standings.table}
              teamId={TEAM_ID}
              nextOpponentId={
                nextMatch
                  ? nextMatch.homeTeam.id === TEAM_ID
                    ? nextMatch.awayTeam.id
                    : nextMatch.homeTeam.id
                  : undefined
              }
            />
          </Card>
        )}

        {/* Row 5: Player Stats */}
        {!loading && playerStats.length > 0 && (
          <Card title="Squad Stats" accent>
            <PlayerStatsTable players={playerStats} />
          </Card>
        )}

        {/* Row 6: Season Charts */}
        {!loading && seasonFixtures.length > 0 && (
          <>
            <Card title="Points Accumulation" accent>
              <PointsChart
                fixtures={seasonFixtures}
                historicalFixtures={historicalFixtures}
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Goals Trend" accent>
                <p className="text-xs text-muted mb-3">
                  Cumulative goals scored vs conceded
                </p>
                <GoalsChart fixtures={seasonFixtures} />
              </Card>

              <Card title="Home vs Away" accent>
                <p className="text-xs text-muted mb-3">
                  Performance comparison by venue
                </p>
                <HomeAwayChart fixtures={seasonFixtures} />
              </Card>
            </div>
          </>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-xs text-muted">
          <span className="font-semibold text-brfc-gold">DashboardFC</span>{" "}
          <span className="text-subtle">v1.21</span>
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
