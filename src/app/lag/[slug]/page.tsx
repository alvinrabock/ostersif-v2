import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import { fetchSingleLag, type FrontspaceLag, type TrainingSession } from "@/lib/frontspace/adapters/lag";
import { fetchNyheterByTeam } from "@/lib/frontspace/adapters/nyheter";
import { fetchSpelareByTeam } from "@/lib/frontspace/adapters/spelare";
import { fetchStabByTeam } from "@/lib/frontspace/adapters/stab";
import { fetchSquadData } from "@/lib/Superadmin/fetchSquad";
import { fetchTeamStats } from "@/lib/Superadmin/fetchTeamStats";
import { getFilteredMatches } from "@/lib/getMatchesWithFallback";
import { getLeaguesGroupedBySeason, type SeasonGroup } from "@/lib/leagueCache";
import { getCurrentSeason, isValidSeason } from "@/lib/season";
import { fetchSvFFTeamStandings } from "@/lib/svff/fetchTeamStandings";
import { notFound } from "next/navigation";
import type { MatchCardData } from "@/types";
import { ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import TeamTabs from "./TeamTabs";
import type { Metadata } from 'next';

/**
 * Fetch team matches filtered by gender (herr/dam).
 * Uses the same league ID resolution as /matcher page:
 * 1. Fetch all matches for the current season from CMS
 * 2. Get league IDs for the team's gender from turneringar (incl. altLeagueIds)
 * 3. Filter matches by matching leagueId against gender league IDs
 *
 * Also returns league name/gender maps for MatchCard rendering.
 */
async function fetchTeamMatches(gender: 'herr' | 'dam'): Promise<{
    upcoming: MatchCardData[];
    played: MatchCardData[];
    leagueNameMap: Record<string, string>;
    leagueGenderMap: Record<string, 'Herrar' | 'Damer'>;
}> {
    const empty = { upcoming: [], played: [], leagueNameMap: {}, leagueGenderMap: {} };
    try {
        const currentSeason = new Date().getFullYear().toString();
        const today = new Date().toISOString().split('T')[0];

        // Fetch season matches and league data in parallel
        const [allMatches, seasons] = await Promise.all([
            getFilteredMatches({ season: currentSeason, limit: 200 }),
            getLeaguesGroupedBySeason(),
        ]);

        // Build gender league ID set + name/gender maps (same logic as MatchArchiveClient)
        const genderLeagueIds = new Set<string>();
        const leagueNameMap: Record<string, string> = {};
        const leagueGenderMap: Record<string, 'Herrar' | 'Damer'> = {};

        for (const s of seasons) {
            for (const t of s.tournaments) {
                const label = t.kon === 'dam' ? 'Damer' as const : 'Herrar' as const;
                leagueNameMap[String(t.leagueId)] = t.LeagueName;
                leagueGenderMap[String(t.leagueId)] = label;
                t.altLeagueIds?.forEach(id => {
                    leagueNameMap[id] = t.LeagueName;
                    leagueGenderMap[id] = label;
                });
            }
        }

        const currentSeasonData = seasons.find(s => s.seasonYear === currentSeason);
        if (currentSeasonData) {
            for (const t of currentSeasonData.tournaments) {
                const isMatch = gender === 'dam'
                    ? t.kon === 'dam'
                    : !t.kon || t.kon === 'herr';
                if (isMatch) {
                    genderLeagueIds.add(String(t.leagueId));
                    t.altLeagueIds?.forEach(id => genderLeagueIds.add(id));
                }
            }
        }

        // Filter matches by gender league IDs
        const genderMatches = allMatches.filter(m => genderLeagueIds.has(String(m.leagueId)));

        // Split into upcoming and played
        const upcoming = genderMatches
            .filter(m => {
                if (m.status === 'Over') return false;
                const kickoffDate = m.kickoff?.split('T')[0] || '';
                return kickoffDate >= today;
            })
            .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
            .slice(0, 5);

        const played = genderMatches
            .filter(m => m.status === 'Over')
            .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
            .slice(0, 4);

        return { upcoming, played, leagueNameMap, leagueGenderMap };
    } catch (error) {
        console.error("Error fetching team matches:", error);
        return empty;
    }
}

// Helper function to format training sessions
function formatTrainingSessions(sessions: TrainingSession[] | undefined) {
    if (!sessions || sessions.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sessions
        .filter((session) => {
            const sessionDate = new Date(session.datum);
            return sessionDate >= today;
        })
        .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
        .map((session) => {
            const date = new Date(session.datum);
            const dayName = date.toLocaleDateString('sv-SE', { weekday: 'long' });
            const formattedDate = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });

            return {
                ...session,
                formattedDag: `${dayName} ${formattedDate}`,
                formattedStartTid: session.startid,
                formattedSlutTid: session.sluttid,
            };
        });
}

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ tab?: string; season?: string }>;
};

// Generate dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    try {
        const teamData = await fetchSingleLag(slug);

        if (!teamData) {
            return {
                title: 'Lag hittades inte',
                description: 'Det begärda laget kunde inte hittas.',
            };
        }

        const description = `${teamData.title} inom Östers IF. Se information om ${teamData.title}.`;

        return {
            title: teamData.title,
            description,
            keywords: `${teamData.title}, Östers IF, fotboll, Växjö, Sverige, lag`,
            openGraph: {
                title: `${teamData.title} - Östers IF`,
                description,
                type: 'website',
                locale: 'sv_SE',
                siteName: 'Östers IF',
                ...(teamData.content.omslagsbild && {
                    images: [{
                        url: teamData.content.omslagsbild,
                        alt: `${teamData.title} lagbild`,
                        width: 1200,
                        height: 630,
                    }]
                }),
            },
            alternates: {
                canonical: `/lag/${slug}`,
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Lag',
            description: 'Lagsida för Östers IF',
        };
    }
}

export default async function Page({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const { slug } = resolvedParams;
    const currentTab = resolvedSearchParams.tab || 'nyheter';

    // Get season from URL or use default (current season based on date)
    const seasonParam = resolvedSearchParams.season;
    const selectedSeason = isValidSeason(seasonParam) ? seasonParam! : getCurrentSeason();

    // Fetch team data from Frontspace
    const teamData: FrontspaceLag | null = await fetchSingleLag(slug);
    if (!teamData) {
        notFound();
    }

    // Check if this is a SEF/SMC integrated team
    const isSEFTeam = teamData.content.fetchfromsefapi === true;
    const smcTeamId = teamData.content.smc_teamid;
    const fogisTeamId = teamData.content.fogis_teamid;
    const fogisTeamSlug = teamData.content.fogis_teamslug;
    // SMC stats (squad, team stats) only available for teams with smc_teamid (herrar)
    const hasSmcStats = !!smcTeamId;
    // Determine team gender from slug/title for match filtering
    const teamGender: 'herr' | 'dam' = (slug.includes('dam') || teamData.title.toLowerCase().includes('dam')) ? 'dam' : 'herr';

    // Fetch data in parallel
    const [teamNews, players, staff, squad, teamStats, teamMatches, svffStandings] = await Promise.all([
        fetchNyheterByTeam(teamData.id, 6),
        fetchSpelareByTeam(teamData.id),
        fetchStabByTeam(teamData.id),
        // Only fetch SMC stats for teams with smc_teamid (herrar)
        hasSmcStats ? fetchSquadData(selectedSeason).catch(() => []) : Promise.resolve([]),
        hasSmcStats ? fetchTeamStats(selectedSeason).catch(() => null) : Promise.resolve(null),
        // Pre-fetch matches for SEF teams, filtered by gender
        isSEFTeam ? fetchTeamMatches(teamGender) : Promise.resolve({ upcoming: [], played: [], leagueNameMap: {}, leagueGenderMap: {} }),
        // Fetch SvFF standings if team has fogis_teamid
        fogisTeamId ? fetchSvFFTeamStandings(fogisTeamId).catch(() => null) : Promise.resolve(null),
    ]);

    // Get upcoming training sessions
    const upcomingTraining = formatTrainingSessions(teamData.content.traningstillfallen);
    const hasTraining = upcomingTraining.length > 0;

    const hasImage = !!teamData.content.omslagsbild;
    const sportadminLink = teamData.content.sportadminlank;

    return (
        <main>
            {/* Hero Section */}
            <div className="relative w-full h-[50svh]">
                {hasImage && (
                    <img
                        src={teamData.content.omslagsbild}
                        alt={teamData.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-custom_dark_dark_red via-custom_dark_dark_red/70 to-custom_dark_dark_red/50 z-10" />

                <div className="absolute inset-0 z-20 flex items-center justify-start">
                    <MaxWidthWrapper>
                        <h1 className="text-white text-4xl md:text-6xl font-bold drop-shadow-md text-left mb-4">
                            {teamData.title}
                        </h1>
                        {sportadminLink && (
                            <a href={sportadminLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="red">
                                    Gå till Sportadmin
                                    <ArrowRight className="inline ml-2 w-4 h-4" />
                                </Button>
                            </a>
                        )}
                    </MaxWidthWrapper>
                </div>
            </div>

            {/* Team Tabs Section */}
            <TeamTabs
                teamTitle={teamData.title}
                teamNews={teamNews}
                hasTraining={hasTraining}
                upcomingTraining={upcomingTraining}
                currentTab={currentTab}
                slug={slug}
                isSEFTeam={isSEFTeam}
                hasSmcStats={hasSmcStats}
                players={players}
                staff={staff}
                smcTeamId={smcTeamId}
                fogisTeamId={fogisTeamId}
                fogisTeamSlug={fogisTeamSlug}
                squad={squad}
                teamStats={teamStats}
                upcomingMatches={teamMatches.upcoming}
                playedMatches={teamMatches.played}
                leagueNameMap={teamMatches.leagueNameMap}
                leagueGenderMap={teamMatches.leagueGenderMap}
                selectedSeason={selectedSeason}
                svffStandings={svffStandings}
            />

            {/* Sportadmin Link Section */}
            {sportadminLink && (
                <div className="bg-custom_dark_dark_red py-10">
                    <MaxWidthWrapper>
                        <div className="text-center">
                            <a
                                href={sportadminLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-white hover:text-gray-300 underline"
                            >
                                Se lagets sida på Sportadmin
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </MaxWidthWrapper>
                </div>
            )}
        </main>
    );
}