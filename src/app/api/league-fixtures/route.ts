import { NextResponse } from "next/server";
import { getAllLeagueFixtures } from "@/lib/api-football";
import { transformFixtures } from "@/lib/adapters/api-football-adapter";

/** ISR: revalidate every 15 minutes — same as standings */
export const revalidate = 900;

export async function GET() {
  try {
    const raw = await getAllLeagueFixtures();
    const data = transformFixtures(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("League fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch league fixtures" },
      { status: 500 }
    );
  }
}
