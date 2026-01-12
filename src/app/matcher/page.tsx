// app/matcher/page.tsx
import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import { Suspense } from "react";
import { getLeaguesGroupedBySeason, getLeagueCache } from "@/lib/leagueCache";
import { getAllMatchesWithTieredCache } from "@/lib/matchCache";
import MatcherArchiveClient from "./MatchArchiveClient";
import type { Metadata } from 'next';
import Link from 'next/link';
import { MatchCardData } from "@/types";

// Use dynamic rendering to support tiered caching
// Finished matches are cached forever, upcoming for 5 min, live always fresh
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Matcher - Östers IF',
  description: 'Se kommande och avslutade matcher för Östers IF. Följ matchresultat, spelschema och tabellställning för våra A-lag och ungdomslag.',
  keywords: 'Östers IF, matcher, spelschema, fotboll, resultat, kommande matcher, Växjö, Superettan, tabellställning',
  openGraph: {
    title: 'Matcher - Östers IF',
    description: 'Se kommande och avslutade matcher för alla lag inom Östers IF. Följ matchresultat och spelschema.',
    type: 'website',
    locale: 'sv_SE',
    siteName: 'Östers IF',
  },
  alternates: {
    canonical: '/matcher',
    languages: {
      'sv-SE': '/matcher',
    },
  },
};

export default async function Page() {
  // Get leagues grouped by season from automated discovery cache
  const [seasons, leagueCache] = await Promise.all([
    getLeaguesGroupedBySeason(),
    getLeagueCache()
  ]);

  // If cache is empty, show setup instructions
  if (!seasons || seasons.length === 0) {
    return (
      <div className="w-full pt-46 pb-36 bg-custom_dark_dark_red">
        <MaxWidthWrapper>
          <div className="text-white space-y-6 max-w-2xl mx-auto text-center py-12">
            <h1 className="text-4xl font-bold">League Cache Not Initialized</h1>
            <p className="text-lg text-gray-300">
              The automated league discovery system needs to be initialized first.
            </p>
            <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-6 text-left">
              <h2 className="font-bold text-xl mb-4">Setup Instructions:</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>Visit the admin page: <Link href="/admin/matcher" className="underline text-yellow-300">/admin/matcher</Link></li>
                <li>Click the &ldquo;🔄 Refresh Cache&rdquo; button</li>
                <li>Wait for the discovery to complete (may take a few minutes)</li>
                <li>Return to this page to view matches</li>
              </ol>
            </div>
            <Link
              href="/admin/matcher"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Admin Page
            </Link>
          </div>
        </MaxWidthWrapper>
      </div>
    );
  }

  // Pre-fetch initial matches server-side using tiered caching
  // Finished matches: cached forever | Upcoming: 5 min cache | Live: always fresh
  let initialMatches: MatchCardData[] = [];
  try {
    const currentYear = new Date().getFullYear().toString();
    const currentSeasonLeagues = seasons.find(s => s.seasonYear === currentYear)?.tournaments || seasons[0]?.tournaments || [];
    const leagueIds = currentSeasonLeagues.map(t => t.leagueId);
    const teamId = leagueCache?.teamId;

    if (leagueIds.length > 0 && teamId) {
      // Use tiered caching: finished (forever), upcoming (5 min), live (fresh)
      const { all } = await getAllMatchesWithTieredCache(leagueIds, teamId);
      initialMatches = all;
    }
  } catch (error) {
    console.error('Error pre-fetching matches:', error);
  }

  return (
    <div className="w-full pt-46 pb-36 bg-custom_dark_dark_red">
      <MaxWidthWrapper>
        <Suspense>
          <MatcherArchiveClient seasons={seasons} initialMatches={initialMatches} />
        </Suspense>
      </MaxWidthWrapper>
    </div>
  );
}