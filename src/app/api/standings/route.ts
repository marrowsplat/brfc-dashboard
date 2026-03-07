import { NextResponse } from "next/server";
import { getStandings } from "@/lib/api-football";
import { transformStandings } from "@/lib/adapters/api-football-adapter";

/**
 * ISR revalidation: Vercel re-generates this at the edge every 15 minutes.
 * One copy shared across all users — scales to many teams/users cheaply.
 */
export const revalidate = 900; // 15 minutes

export async function GET() {
  try {
    const raw = await getStandings();
    const data = transformStandings(raw);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Standings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
