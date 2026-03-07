import { NextResponse } from "next/server";
import { getFixtureStats, getFixtureEvents } from "@/lib/api-football";
import {
  transformEvents,
  transformMatchStats,
} from "@/lib/adapters/api-football-adapter";

/** ISR: match stats are immutable once FT — long revalidation */
export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("id");

  if (!fixtureId) {
    return NextResponse.json(
      { error: "Missing fixture id parameter" },
      { status: 400 }
    );
  }

  try {
    const [rawStats, rawEvents] = await Promise.all([
      getFixtureStats(fixtureId),
      getFixtureEvents(fixtureId),
    ]);

    const stats = transformMatchStats(rawStats as never[]);
    const events = transformEvents(rawEvents);
    return NextResponse.json({ stats, events }, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800",
      },
    });
  } catch (error) {
    console.error("Fixture stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixture stats" },
      { status: 500 }
    );
  }
}
