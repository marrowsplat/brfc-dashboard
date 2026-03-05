import { NextResponse } from "next/server";
import { getStandings } from "@/lib/api-football";
import { transformStandings } from "@/lib/adapters/api-football-adapter";

export async function GET() {
  try {
    const raw = await getStandings();
    const data = transformStandings(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Standings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
