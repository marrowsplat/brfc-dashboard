import { NextResponse } from "next/server";
import { getFixtureStats, getFixtureEvents } from "@/lib/api-football";

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
    const [stats, events] = await Promise.all([
      getFixtureStats(fixtureId),
      getFixtureEvents(fixtureId),
    ]);

    return NextResponse.json({ stats, events });
  } catch (error) {
    console.error("Fixture stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixture stats" },
      { status: 500 }
    );
  }
}
