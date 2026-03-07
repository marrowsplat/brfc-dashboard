import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/api-football";
import { transformPlayerStats } from "@/lib/adapters/api-football-adapter";

/** ISR: player stats change slowly — revalidate every hour */
export const revalidate = 3600;

export async function GET() {
  try {
    const raw = await getPlayerStats();
    const data = transformPlayerStats(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Players error:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
