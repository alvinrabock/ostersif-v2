import { NextRequest, NextResponse } from "next/server";

interface RawLiveStats {
  "home-team-score": number;
  "away-team-score": number;
  "match-phase": string;
  "game-clock-in-min": number;
  "actual-start-of-first-half": string;
  "actual-end-of-first-half": string;
  "actual-start-of-second-half": string;
  "actual-end-of-second-half": string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId");
  const leagueId = searchParams.get("leagueId");

  if (!matchId || !leagueId) {
    return NextResponse.json(
      { error: "Missing matchId or leagueId" },
      { status: 400 }
    );
  }

  const apiSecret = process.env.SMC_SECRET;
  if (!apiSecret) {
    return NextResponse.json(
      { error: "SMC_SECRET not configured" },
      { status: 500 }
    );
  }

  try {
    const liveStatsUrl = `https://smc-api.telenor.no/leagues/${leagueId}/matches/${matchId}/live-stats`;
    const response = await fetch(liveStatsUrl, {
      method: "GET",
      headers: {
        Authorization: apiSecret,
        Accept: "application/json",
      },
      // No caching for live stats - always fresh
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch live stats" },
        { status: response.status }
      );
    }

    const liveStats = (await response.json()) as RawLiveStats;

    return NextResponse.json({
      "home-team-score": liveStats["home-team-score"],
      "away-team-score": liveStats["away-team-score"],
      "match-phase": liveStats["match-phase"],
      "game-clock-in-min": liveStats["game-clock-in-min"],
      "actual-start-of-first-half": liveStats["actual-start-of-first-half"],
      "actual-end-of-first-half": liveStats["actual-end-of-first-half"],
      "actual-start-of-second-half": liveStats["actual-start-of-second-half"],
      "actual-end-of-second-half": liveStats["actual-end-of-second-half"],
    });
  } catch (error) {
    console.error("Error fetching live stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
