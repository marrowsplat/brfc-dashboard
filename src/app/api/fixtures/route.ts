import { NextResponse } from "next/server";
import {
  getLastFixtures,
  getNextFixtures,
  getSeasonFixtures,
} from "@/lib/api-football";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "last";
  const count = parseInt(searchParams.get("count") || "10", 10);

  try {
    let data;
    switch (type) {
      case "next":
        data = await getNextFixtures(count);
        break;
      case "season":
        data = await getSeasonFixtures();
        break;
      case "last":
      default:
        data = await getLastFixtures(count);
        break;
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fixtures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixtures" },
      { status: 500 }
    );
  }
}
