"use server"
export async function fetchStandings(leagueId: string) {
    const apiSecret = process.env.SMC_SECRET;

    // Check if API credentials are missing
    if (!apiSecret) {
      throw new Error("SMC_SECRET is missing! Check your .env file.");
    }

    const url = `https://smc-api.telenor.no/leagues/${leagueId}/standings`;

    // Add timeout to prevent hanging during build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Authorization": apiSecret,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error("Failed to fetch standings");
      }

      return res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout fetching standings for league ${leagueId}`);
      }
      throw error;
    }
  }
  