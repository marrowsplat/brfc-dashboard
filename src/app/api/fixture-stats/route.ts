import { NextResponse } from "next/server";
import { getFixtureStats, getFixtureEvents } from "@/lib/api-football";
import { transformEvents } from "@/lib/adapters/api-football-adapter";

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
    const [stats, rawEvents] = await Promise.all([
      getFixtureStats(fixtureId),
      getFixtureEvents(fixtureId),
    ]);

    const events = transformEvents(rawEvents);
    return NextResponse.json({ stats, events });
  } catch (error) {
    console.error("Fixture stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixture stats" },
      { status: 500 }
    );
  }
}
