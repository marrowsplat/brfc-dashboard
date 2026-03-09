import { NextResponse } from "next/server";
import { getHeadToHead } from "@/lib/api-football";
import { transformFixtures } from "@/lib/adapters/api-football-adapter";

/** ISR: h2h data changes slowly — revalidate every hour */
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");
  const last = searchParams.get("last") || "5";

  if (!team1 || !team2) {
    return NextResponse.json(
      { error: "team1 and team2 parameters are required" },
      { status: 400 }
    );
  }

  try {
    const raw = await getHeadToHead(team1, team2, parseInt(last, 10));
    const data = transformFixtures(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("H2H error:", error);
    return NextResponse.json(
      { error: "Failed to fetch head-to-head data" },
      { status: 500 }
    );
  }
}
