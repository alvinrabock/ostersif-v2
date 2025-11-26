"use server"
import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import client from "@/lib/apollo/apolloClient";
import { GET_POSTS_BY_LAG } from "@/lib/apollo/fetchNyheter/PostsByLagQuery";
import { fetchTeamBySlug } from "@/lib/apollo/fetchTeam/fetchSingleTeamAction";
import { notFound } from "next/navigation";
import { Media } from "@/app/components/Media/index";
import type { Lag, Post, TruppPlayers } from "@/types";
import { fetchSquadData } from "@/lib/Superadmin/fetchSquad";
import { fetchTeamStats } from "@/lib/Superadmin/fetchTeamStats";
import { ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import type { Metadata } from 'next';
import TeamTabs from './TeamTabs';

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Generate dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    try {
        const teamData: Lag | null = await fetchTeamBySlug(slug);

        if (!teamData) {
            return {
                title: 'Lag hittades inte - Östers IF',
                description: 'Det begärda laget kunde inte hittas.',
            };
        }

        const teamType = teamData.aLag ? 'A-lag' : 'Ungdomslag';
        const description = `${teamData.title} - ${teamType} inom Östers IF. Se nyheter, spelare, statistik och kommande matcher för ${teamData.title}.`;

        // Get team banner image for Open Graph
        let ogImage: string | undefined;
        if (teamData.banner && typeof teamData.banner === 'object' && teamData.banner !== null) {
            // Check if it's a Media object with sizes
            if ('sizes' in teamData.banner && teamData.banner.sizes?.og?.url) {
                ogImage = teamData.banner.sizes.og.url;
            } else if ('url' in teamData.banner && teamData.banner.url) {
                // Fallback to main URL if og size not available
                ogImage = teamData.banner.url;
            }
        }

        return {
            title: `${teamData.title} - Östers IF`,
            description,
            keywords: `${teamData.title}, Östers IF, fotboll, ${teamType.toLowerCase()}, Växjö, Sverige, lag, spelare, matcher`,
            openGraph: {
                title: `${teamData.title} - Östers IF`,
                description,
                type: 'website',
                locale: 'sv_SE',
                siteName: 'Östers IF',
                ...(ogImage && {
                    images: [{
                        url: ogImage,
                        alt: `${teamData.title} lagbild`,
                        width: (typeof teamData.banner === 'object' && teamData.banner !== null && 'sizes' in teamData.banner && teamData.banner.sizes?.og?.width) || 1200,
                        height: (typeof teamData.banner === 'object' && teamData.banner !== null && 'sizes' in teamData.banner && teamData.banner.sizes?.og?.height) || 630,
                    }]
                }),
            },
            alternates: {
                canonical: `/lag/${slug}`,
                languages: {
                    'sv-SE': `/lag/${slug}`,
                },
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Lag - Östers IF',
            description: 'Lagsida för Östers IF',
        };
    }
}

function formatToSwedishWeekdayDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Stockholm',
    }).format(date);
}

function formatToSwedishTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Stockholm',
    }).format(date);
}

function getTeamData(teamData: Lag) {
    return {
        hasTraining: Array.isArray(teamData?.traningstider) && teamData.traningstider.length > 0,
        isALag: teamData?.aLag === true,
        hasStaff: Array.isArray(teamData.staff) && teamData.staff.length > 0,
        hasSportadminLink: !!teamData?.Sportadminlink,
    };
}

function getUpcomingTraining(traningstider: Lag["traningstider"]) {
    if (!Array.isArray(traningstider)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return traningstider.filter((traning) => {
        const trainingDate = new Date(traning.dag);
        trainingDate.setHours(0, 0, 0, 0);
        return trainingDate >= today;
    }).map(traning => ({
        ...traning,
        // Pre-format the dates on the server side
        formattedDag: formatToSwedishWeekdayDate(traning.dag),
        formattedStartTid: formatToSwedishTime(traning.startTid),
        formattedSlutTid: formatToSwedishTime(traning.slutTid),
    }));
}

export default async function Page({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const { slug } = resolvedParams;
    const currentTab = resolvedSearchParams.tab as string || 'nyheter';

    const REVALIDATE_TAG = 'posts-data';

    // Fetch team data
    const teamData: Lag | null = await fetchTeamBySlug(slug);
    if (!teamData) {
        notFound();
    }

    // Fetch posts for the current team
    const { data: postsData } = await client.query({
        query: GET_POSTS_BY_LAG,
        variables: { lagId: teamData.id, limit: 5 },
        fetchPolicy: 'network-only',
        context: {
            fetchOptions: {
                next: {
                    tags: [REVALIDATE_TAG],
                },
            },
        },
    });

    const posts = postsData?.Posts?.docs || [];
    const sortedPosts = [...posts].sort((a: Post, b: Post) => {
        const dateA = new Date(a.publishedAt || a.createdAt || 0);
        const dateB = new Date(b.publishedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });

    let squad: TruppPlayers[] = [];
    try {
        squad = await fetchSquadData();
    } catch (error) {
        console.error("Error fetching squad data:", error);
    }

    const teamStats = await fetchTeamStats();
    const { isALag, hasStaff, hasTraining } = getTeamData(teamData);
    const upcomingTraining = getUpcomingTraining(teamData.traningstider ?? []);

    // Prepare data for client component
    const tabsData = {
        teamData,
        sortedPosts,
        squad,
        teamStats,
        isALag,
        hasStaff,
        hasTraining,
        upcomingTraining,
        currentTab,
        slug,
    };

    return (
        <main>
            {/* Hero Section */}
            <div className="relative w-full h-[50svh]">
                {teamData.banner && (
                    <Media
                        resource={teamData.banner}
                        alt="Lagbild"
                        fill
                        imgClassName="object-cover"
                        priority
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-custom_dark_dark_red via-custom_dark_dark_red/70 to-custom_dark_dark_red/50 z-10" />

                <div className="absolute inset-0 z-20 flex items-center justify-start">
                    <MaxWidthWrapper>
                        <h1 className="text-white text-4xl md:text-6xl font-bold drop-shadow-md text-left mb-4">
                            {teamData.title}
                        </h1>
                        {teamData.Sportadminlink && (
                            <a href={teamData.Sportadminlink} target="_blank" rel="noopener noreferrer">
                                <Button variant="red">
                                    Gå till Sportadmin
                                    <ArrowRight className="inline ml-2 w-4 h-4" />
                                </Button>
                            </a>
                        )}
                    </MaxWidthWrapper>
                </div>
            </div>

            {/* Client-side tabs component */}
            <TeamTabs {...tabsData} />
        </main>
    );
}