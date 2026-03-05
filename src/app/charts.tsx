"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Fixture } from "@/lib/domain-types";

const TEAM_ID = 1334;

// ─── Data helpers ──────────────────────────────────────────

function resultFor(
  f: Fixture,
  teamId: number
): "W" | "D" | "L" | null {
  if (f.status !== "FT") return null;
  const isHome = f.homeTeam.id === teamId;
  const teamGoals = isHome ? f.homeGoals : f.awayGoals;
  const oppGoals = isHome ? f.awayGoals : f.homeGoals;
  if (teamGoals === null || oppGoals === null) return null;
  if (teamGoals > oppGoals) return "W";
  if (teamGoals < oppGoals) return "L";
  return "D";
}

function pointsFor(result: "W" | "D" | "L" | null): number {
  if (result === "W") return 3;
  if (result === "D") return 1;
  return 0;
}

function buildSeasonData(fixtures: Fixture[]) {
  const completed = fixtures.filter((f) => f.status === "FT");
  let cumulativePoints = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  return completed.map((f, i) => {
    const isHome = f.homeTeam.id === TEAM_ID;
    const scored = isHome ? f.homeGoals ?? 0 : f.awayGoals ?? 0;
    const conceded = isHome ? f.awayGoals ?? 0 : f.homeGoals ?? 0;
    const result = resultFor(f, TEAM_ID);
    const pts = pointsFor(result);

    cumulativePoints += pts;
    goalsFor += scored;
    goalsAgainst += conceded;

    const matchNum = i + 1;
    // Pace lines: 46 matches in season
    // Promotion (auto): ~82 pts → 1.78 ppg
    // Playoffs: ~70 pts → 1.52 ppg
    // Relegation: ~45 pts → 0.98 ppg
    const promoAutoPace = Math.round(matchNum * 1.78);
    const playoffPace = Math.round(matchNum * 1.52);
    const relegationPace = Math.round(matchNum * 0.98);

    // Round label from "Regular Season - 1" → "1"
    const round = f.leagueRound.replace("Regular Season - ", "");

    return {
      round,
      matchNum,
      points: cumulativePoints,
      promoAutoPace,
      playoffPace,
      relegationPace,
      scored,
      conceded,
      goalsFor,
      goalsAgainst,
      opponent: isHome ? f.awayTeam.name : f.homeTeam.name,
      venue: isHome ? "H" : "A",
      result: result ?? "-",
    };
  });
}

function buildHomeAwayData(fixtures: Fixture[]) {
  const completed = fixtures.filter((f) => f.status === "FT");

  let homeW = 0, homeD = 0, homeL = 0, homeGF = 0, homeGA = 0, homeGames = 0;
  let awayW = 0, awayD = 0, awayL = 0, awayGF = 0, awayGA = 0, awayGames = 0;

  completed.forEach((f) => {
    const isHome = f.homeTeam.id === TEAM_ID;
    const scored = isHome ? f.homeGoals ?? 0 : f.awayGoals ?? 0;
    const conceded = isHome ? f.awayGoals ?? 0 : f.homeGoals ?? 0;
    const result = resultFor(f, TEAM_ID);

    if (isHome) {
      homeGames++;
      homeGF += scored;
      homeGA += conceded;
      if (result === "W") homeW++;
      else if (result === "D") homeD++;
      else if (result === "L") homeL++;
    } else {
      awayGames++;
      awayGF += scored;
      awayGA += conceded;
      if (result === "W") awayW++;
      else if (result === "D") awayD++;
      else if (result === "L") awayL++;
    }
  });

  const homePts = homeW * 3 + homeD;
  const awayPts = awayW * 3 + awayD;

  return [
    {
      category: "Wins",
      Home: homeW,
      Away: awayW,
    },
    {
      category: "Draws",
      Home: homeD,
      Away: awayD,
    },
    {
      category: "Losses",
      Home: homeL,
      Away: awayL,
    },
    {
      category: "Goals For",
      Home: homeGF,
      Away: awayGF,
    },
    {
      category: "Goals Against",
      Home: homeGA,
      Away: awayGA,
    },
    {
      category: "Points",
      Home: homePts,
      Away: awayPts,
    },
  ];
}

// ─── Custom tooltip ─────────────────────────────────────────

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

function PointsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (payload[0] as any)?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-800 mb-1">
        Rd {label} {data?.venue === "H" ? "vs" : "@"} {data?.opponent}
      </p>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function GoalsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (payload[0] as any)?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-800 mb-1">
        Rd {label} {data?.venue === "H" ? "vs" : "@"} {data?.opponent} ({data?.result})
      </p>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Info panel ────────────────────────────────────────────

function ChartInfo({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        aria-expanded={open}
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-[10px] font-semibold leading-none">
          i
        </span>
        <span>{open ? "Hide" : "How is this calculated?"}</span>
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Chart components ──────────────────────────────────────

export function PointsChart({ fixtures }: { fixtures: Fixture[] }) {
  const data = buildSeasonData(fixtures);
  if (data.length === 0) return null;

  return (
    <div>
      <ChartInfo>
        <p className="mb-1">
          <strong className="text-slate-700">Solid blue line</strong> — Bristol
          Rovers&apos; actual cumulative points (3 for a win, 1 for a draw).
        </p>
        <p className="mb-1">
          <strong className="text-slate-700">Dashed pace lines</strong> — show
          where a team &quot;should&quot; be at each match to hit a target total
          over a 46-game League Two season, based on historical averages:
        </p>
        <ul className="list-disc list-inside ml-1 space-y-0.5">
          <li>
            <span className="text-green-600 font-semibold">Auto Promotion</span>{" "}
            ≈ 82 pts (1.78 pts/game)
          </li>
          <li>
            <span className="text-amber-600 font-semibold">Playoff Pace</span>{" "}
            ≈ 70 pts (1.52 pts/game)
          </li>
          <li>
            <span className="text-red-600 font-semibold">Relegation</span>{" "}
            ≈ 45 pts (0.98 pts/game)
          </li>
        </ul>
        <p className="mt-1 text-slate-400">
          Hover over the chart to see match-by-match detail.
        </p>
      </ChartInfo>
      <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <Tooltip content={<PointsTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#0047AB"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#0047AB" }}
            name="Bristol Rovers"
          />
          <Line
            type="monotone"
            dataKey="promoAutoPace"
            stroke="#16A34A"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            name="Auto Promotion"
          />
          <Line
            type="monotone"
            dataKey="playoffPace"
            stroke="#D97706"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            name="Playoff Pace"
          />
          <Line
            type="monotone"
            dataKey="relegationPace"
            stroke="#DC2626"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            name="Relegation"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GoalsChart({ fixtures }: { fixtures: Fixture[] }) {
  const data = buildSeasonData(fixtures);
  if (data.length === 0) return null;

  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <Tooltip content={<GoalsTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            iconType="circle"
            iconSize={8}
          />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Line
            type="monotone"
            dataKey="goalsFor"
            stroke="#16A34A"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#16A34A" }}
            name="Goals Scored"
          />
          <Line
            type="monotone"
            dataKey="goalsAgainst"
            stroke="#DC2626"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#DC2626" }}
            name="Goals Conceded"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HomeAwayChart({ fixtures }: { fixtures: Fixture[] }) {
  const data = buildHomeAwayData(fixtures);
  if (data.length === 0) return null;

  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} />
          <Tooltip
            contentStyle={{
              fontSize: "11px",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Home" fill="#0047AB" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Away" fill="#D4A843" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
