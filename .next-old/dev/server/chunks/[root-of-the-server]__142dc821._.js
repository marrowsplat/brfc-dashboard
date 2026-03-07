module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/api-football.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getFixtureEvents",
    ()=>getFixtureEvents,
    "getFixtureStats",
    ()=>getFixtureStats,
    "getLastFixtures",
    ()=>getLastFixtures,
    "getNextFixtures",
    ()=>getNextFixtures,
    "getSeasonFixtures",
    ()=>getSeasonFixtures,
    "getStandings",
    ()=>getStandings
]);
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
 */ const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY || "";
const cache = new Map();
async function fetchWithCache(endpoint, params, cacheDurationMs) {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v])=>url.searchParams.set(k, v));
    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        return cached.data;
    }
    const res = await fetch(url.toString(), {
        headers: {
            "x-apisports-key": API_KEY
        }
    });
    if (!res.ok) {
        throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    // Check for API-level errors (e.g. plan restrictions)
    if (json.errors && Object.keys(json.errors).length > 0) {
        console.warn("API-Football warning:", json.errors);
    }
    cache.set(cacheKey, {
        data: json,
        expiry: Date.now() + cacheDurationMs
    });
    return json;
}
// --- Cache durations ---
const HOURS = (n)=>n * 60 * 60 * 1000;
// --- Public API ---
const TEAM_ID = process.env.TEAM_ID || "1334";
const LEAGUE_ID = process.env.LEAGUE_ID || "41";
const SEASON = process.env.SEASON || "2024";
async function getStandings() {
    const data = await fetchWithCache("/standings", {
        league: LEAGUE_ID,
        season: SEASON
    }, HOURS(2));
    const standings = data.response?.[0]?.league?.standings?.[0];
    if (!standings) return null;
    // Find our team's position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamEntry = standings.find((entry)=>{
        return entry.team && String(entry.team.id) === TEAM_ID;
    });
    return {
        table: standings,
        team: teamEntry || null,
        leagueName: data.response?.[0]?.league?.name || "League"
    };
}
async function getSeasonFixtures() {
    const data = await fetchWithCache("/fixtures", {
        team: TEAM_ID,
        league: LEAGUE_ID,
        season: SEASON
    }, HOURS(2));
    return data.response || [];
}
async function getLastFixtures(count = 10) {
    const all = await getSeasonFixtures();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = all.filter((f)=>f.fixture.status.short === "FT");
    return completed.slice(-count);
}
async function getNextFixtures(count = 5) {
    const all = await getSeasonFixtures();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upcoming = all.filter((f)=>{
        const status = f.fixture.status.short;
        return status === "NS" || status === "TBD";
    });
    return upcoming.slice(0, count);
}
async function getFixtureStats(fixtureId) {
    const data = await fetchWithCache("/fixtures/statistics", {
        fixture: fixtureId
    }, HOURS(24 * 30));
    return data.response || [];
}
async function getFixtureEvents(fixtureId) {
    const data = await fetchWithCache("/fixtures/events", {
        fixture: fixtureId
    }, HOURS(24 * 30));
    return data.response || [];
}
}),
"[project]/src/app/api/standings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$football$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api-football.ts [app-route] (ecmascript)");
;
;
async function GET() {
    try {
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$football$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getStandings"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
    } catch (error) {
        console.error("Standings error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to fetch standings"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__142dc821._.js.map