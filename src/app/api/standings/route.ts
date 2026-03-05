import { NextResponse } from "next/server";
import { getStandings } from "@/lib/api-football";

export async function GET() {
  try {
    const data = await getStandings();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Standings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
