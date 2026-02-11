import MatchCard from "@/app/components/Match/MatchCard";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { getUpcomingMatches } from "@/lib/getMatchesWithFallback";
import { Button } from "../ui/Button";
import Link from "next/link";

export default async function UpcomingMatches() {
    // Server-side fetch from CMS - only get 3 upcoming matches
    const matches = await getUpcomingMatches(3);

    return (
        <div className="flex flex-col gap-4 mt-[-200px] mb-20 z-100 relative">
            <MaxWidthWrapper>
                <h2 className="text-2xl font-bold text-white mb-2">Nästa match</h2>

                {matches.length === 0 && (
                    <p className="text-white">Inga kommande matcher tillgängliga.</p>
                )}

                {matches.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {matches.map((match, index) => (
                            <MatchCard
                                key={match.cmsId || match.externalMatchId || match.matchId}
                                match={match}
                                colorTheme={index === 0 ? "red" : "outline"}
                            />
                        ))}
                    </div>
                )}

                <Link href="/matcher" className="block mt-4">
                    <Button variant="default" className="w-full">
                        Visa alla matcher
                    </Button>
                </Link>
            </MaxWidthWrapper>
        </div>
    );
}
