import { NextResponse } from "next/server";
import {
  getLastFixtures,
  getNextFixtures,
  getSeasonFixtures,
} from "@/lib/api-football";
import { transformFixtures } from "@/lib/adapters/api-football-adapter";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "last";
  const count = parseInt(searchParams.get("count") || "10", 10);

  try {
    let raw;
    switch (type) {
      case "next":
        raw = await getNextFixtures(count);
        break;
      case "season":
        raw = await getSeasonFixtures();
        break;
      case "last":
      default:
        raw = await getLastFixtures(count);
        break;
    }
    const data = transformFixtures(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures" },
      { status: 500 }
    );
  }
}
