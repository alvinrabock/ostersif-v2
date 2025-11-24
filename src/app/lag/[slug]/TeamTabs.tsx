'use client';

import { lazy, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import NyheterItem from "@/app/components/Nyheter/nyheterItem";
import MiniNyheterItem from "@/app/components/Nyheter/miniNyheterItem";
import type { Lag, Post, SuperAdminTeamStats, TruppPlayers } from "@/types";
import { Users, BarChart3, Trophy, Calendar, Newspaper, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { StaffSection } from '@/app/components/Player/StaffSection';
import { PlayerCardCMS } from '@/app/components/Player/PlayerCardCMS';

// Lazy load heavy components
const StandingsTable = lazy(() => import('@/app/components/Lag/StandingsTable'));
const TeamStatsOverview = lazy(() => import('@/app/components/Lag/TeamStatsOverview'));
const KommandeMatcher = lazy(() => import('@/app/components/Lag/KommandeMatcher'));
const SenastSpeladeMatcher = lazy(() => import('@/app/components/Lag/SenastSpeladeMatcher'));
const FunStats = lazy(() => import('@/app/components/Player/FunStats'));

const TabContentSkeleton = () => (
    <div className="animate-pulse p-8">
        <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
    </div>
);


interface TrainingSession {
    dag: string;
    startTid: string;
    slutTid: string;
    plats?: string | null;
    noteringar?: string | null;
    id?: string | null;
    formattedDag: string;
    formattedStartTid: string;
    formattedSlutTid: string;
}

interface TeamTabsProps {
    teamData: Lag;
    sortedPosts: Post[];
    squad: TruppPlayers[];
    teamStats: SuperAdminTeamStats | null;
    isALag: boolean;
    hasStaff: boolean;
    hasTraining: boolean;
    upcomingTraining: TrainingSession[];
    currentTab: string;
    slug: string;
}

export default function TeamTabs({
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
}: TeamTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleTabChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (value === 'nyheter') {
            // Remove tab param for default tab
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        
        const newUrl = params.toString() 
            ? `/lag/${slug}?${params.toString()}`
            : `/lag/${slug}`;
            
        router.push(newUrl, { scroll: false });
    }, [router, searchParams, slug]);

    return (
        <div className="bg-custom_dark_dark_red">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full z-10 relative">
                <MaxWidthWrapper>
                    <TabsList className="w-full justify-start px-2 py-8 sm:p-8 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-white scrollbar-track-transparent bg-custom_dark_red gap-2">
                        <TabsTrigger
                            value="nyheter"
                            className="
                            transition-all duration-200 border-b-2 border-transparent
                            hover:bg-custom_red/20 rounded-xl
                            text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                            shadow-none text-white font-bold
                            data-[state=active]:text-white
                            data-[state=active]:border-white
                            data-[state=active]:bg-transparent
                            data-[state=active]:shadow-none
                            data-[state=active]:rounded-none
                            flex items-center justify-center gap-2
                        "
                        >
                            <Newspaper className="w-8 h-8" />
                            Nyheter
                        </TabsTrigger>

                        {isALag && (
                            <TabsTrigger
                                value="truppen"
                                className="
                                transition-all duration-200 border-b-2 border-transparent
                                hover:bg-custom_red/20 rounded-xl
                                text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                                shadow-none text-white font-bold
                                data-[state=active]:text-white
                                data-[state=active]:border-white
                                data-[state=active]:bg-transparent
                                data-[state=active]:shadow-none
                                data-[state=active]:rounded-none
                                flex items-center justify-center gap-2
                            "
                            >
                                <Users className="w-8 h-8" />
                                Truppen
                            </TabsTrigger>
                        )}

                        {hasTraining && (
                            <TabsTrigger
                                value="traning"
                                className="
                                transition-all duration-200 border-b-2 border-transparent
                                hover:bg-custom_red/20 rounded-xl
                                text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                                shadow-none text-white font-bold
                                data-[state=active]:text-white
                                data-[state=active]:border-white
                                data-[state=active]:bg-transparent
                                data-[state=active]:shadow-none
                                data-[state=active]:rounded-none
                                flex items-center justify-center gap-2
                            "
                            >
                                <Clock className="w-8 h-8" />
                                Träning
                            </TabsTrigger>
                        )}

                        {isALag && (
                            <TabsTrigger
                                value="matcher"
                                className="
                                transition-all duration-200 border-b-2 border-transparent
                                hover:bg-custom_red/20 rounded-xl
                                text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                                shadow-none text-white font-bold
                                data-[state=active]:text-white
                                data-[state=active]:border-white
                                data-[state=active]:bg-transparent
                                data-[state=active]:shadow-none
                                data-[state=active]:rounded-none
                                flex items-center justify-center gap-2
                            "
                            >
                                <Calendar className="w-8 h-8" />
                                Matcher
                            </TabsTrigger>
                        )}

                        {isALag && (
                            <TabsTrigger
                                value="statistik"
                                className="
                                transition-all duration-200 border-b-2 border-transparent
                                hover:bg-custom_red/20 rounded-xl
                                text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                                shadow-none text-white font-bold
                                data-[state=active]:text-white
                                data-[state=active]:border-white
                                data-[state=active]:bg-transparent
                                data-[state=active]:shadow-none
                                data-[state=active]:rounded-none
                                flex items-center justify-center gap-2
                            "
                            >
                                <BarChart3 className="w-8 h-8" />
                                Statistik
                            </TabsTrigger>
                        )}

                        {isALag && (
                            <TabsTrigger
                                value="tabell"
                                className="
                                transition-all duration-200 border-b-2 border-transparent
                                hover:bg-custom_red/20 rounded-xl
                                text-xs sm:text-[15px] text-center whitespace-nowrap px-4 py-2
                                shadow-none text-white font-bold
                                data-[state=active]:text-white
                                data-[state=active]:border-white
                                data-[state=active]:bg-transparent
                                data-[state=active]:shadow-none
                                data-[state=active]:rounded-none
                                flex items-center justify-center gap-2
                            "
                            >
                                <Trophy className="w-8 h-8" />
                                Tabell
                            </TabsTrigger>
                        )}
                    </TabsList>
                </MaxWidthWrapper>

                {/* Tab Contents */}
                <TabsContent value="nyheter" className="mt-0">
                    <MaxWidthWrapper>
                        <div className="pt-10 pb-20">
                            {sortedPosts.length > 0 ? (
                                <div className='text-white'>
                                    <h2 className="text-3xl font-bold mb-8 text-white">Nyheter om {teamData.title}</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10">
                                        <NyheterItem key={sortedPosts[0].id} post={sortedPosts[0]} />
                                        <div className="space-y-6">
                                            {sortedPosts.slice(1).map((post: Post) => (
                                                <MiniNyheterItem key={post.id} post={post} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-white text-center py-20">
                                    <h2 className="text-3xl font-bold mb-4">Inga nyheter än</h2>
                                    <p className="text-gray-300">Det finns inga nyheter om {teamData.title} just nu.</p>
                                </div>
                            )}
                        </div>
                    </MaxWidthWrapper>
                </TabsContent>

                {isALag && (
                    <TabsContent value="truppen" className="mt-0">
                        <div className="w-full py-10 bg-custom_dark_dark_red">
                            <MaxWidthWrapper>
                                <div className="w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="col-span-1 md:col-span-2 w-full">
                                            <h2 className="text-white text-3xl font-bold mb-6">Spelare</h2>
                                            <div className="mt-10 grid grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16">
                                                {teamData.players?.map((person, index: number) => (
                                                    <PlayerCardCMS key={index} person={person} />
                                                ))}
                                            </div>
                                        </div>
                                        {hasStaff && teamData.staff && (
                                            <StaffSection staff={teamData.staff} />
                                        )}
                                    </div>
                                </div>
                            </MaxWidthWrapper>
                        </div>
                    </TabsContent>
                )}

                {hasTraining && (
                    <TabsContent value="traning">
                        <MaxWidthWrapper>
                            <div className="pt-10 pb-20">
                                <h2 className="text-3xl font-bold mb-8 text-left text-white">Kommande träningar</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {upcomingTraining.map((traning, index) => (
                                        <div
                                            key={index}
                                            className="relative rounded-xl p-6 pt-16 shadow-md border border-white/20 hover:border-white/20 hover:shadow-xl transition-all duration-300 group"
                                        >
                                            <p className="absolute top-0 left-0 bg-custom_dark_red p-2 font-bold capitalize tracking-tight text-white rounded-tl-xl rounded-br-xl">
                                                {traning.formattedDag}
                                            </p>
                                            <div className="flex items-start gap-3">
                                                <p className="absolute top-0 right-0 text-white text-sm px-3 py-2">
                                                    {traning.formattedStartTid} – {traning.formattedSlutTid}
                                                </p>
                                            </div>
                                            <div className="space-y-4 text-sm text-white">
                                                {traning.plats && <p>{traning.plats}</p>}
                                                {traning.noteringar && (
                                                    <div className="bg-white/10 p-4 rounded-lg">
                                                        <p className="text-white/80 whitespace-pre-line text-sm">
                                                            {traning.noteringar}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {upcomingTraining.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-white/80 text-lg">
                                            Inga kommande träningar schemalagda just nu.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </MaxWidthWrapper>
                    </TabsContent>
                )}

                {isALag && (
                    <TabsContent value="matcher" className="mt-0">
                        <MaxWidthWrapper>
                            <div className="pt-10 pb-20">
                                <div className="grid grid-cols-1 gap-10">
                                    <div>
                                        <h2 className="text-3xl font-bold mb-8 text-left text-white">Kommande Matcher</h2>
                                        <Suspense fallback={<TabContentSkeleton />}>
                                            <KommandeMatcher />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </MaxWidthWrapper>
                    </TabsContent>
                )}

                {isALag && (
                    <TabsContent value="statistik" className="mt-0">
                        <MaxWidthWrapper>
                            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-10 mt-10 mb-10">
                                <Suspense fallback={<TabContentSkeleton />}>
                                    <FunStats players={squad} />
                                </Suspense>
                                <div className="col-span-3 sm:col-span-1 lg:col-span-2 text-white">
                                    <Suspense fallback={<TabContentSkeleton />}>
                                        <SenastSpeladeMatcher />
                                    </Suspense>
                                </div>
                            </div>
                        </MaxWidthWrapper>
                        <div className="mb-10 w-full bg-custom_dark_red">
                            <MaxWidthWrapper>
                                <TeamStatsOverview stats={teamStats} />
                            </MaxWidthWrapper>
                        </div>
                    </TabsContent>
                )}

                {isALag && (
                    <TabsContent value="tabell" className="mt-0">
                        <MaxWidthWrapper>
                            <div className="pt-10 pb-20">
                                <h2 className="text-3xl font-bold mb-8 text-left text-white">Tabell</h2>
                                <Suspense fallback={<TabContentSkeleton />}>
                                    <StandingsTable />
                                </Suspense>
                            </div>
                        </MaxWidthWrapper>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}