import { NextResponse } from "next/server";
import { getHistoricalSeasonFixtures } from "@/lib/api-football";
import { transformFixtures } from "@/lib/adapters/api-football-adapter";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season");

  if (!season) {
    return NextResponse.json(
      { error: "season parameter is required" },
      { status: 400 }
    );
  }

  try {
    const raw = await getHistoricalSeasonFixtures(season);
    const data = transformFixtures(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Historical fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical fixtures" },
      { status: 500 }
    );
  }
}
