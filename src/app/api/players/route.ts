import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/api-football";
import { transformPlayerStats } from "@/lib/adapters/api-football-adapter";

export async function GET() {
  try {
    const raw = await getPlayerStats();
    const data = transformPlayerStats(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Players error:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
