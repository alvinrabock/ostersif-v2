"use client";

import React, { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { MatchCardData } from "@/types";
import { getMatches } from "@/lib/fetchMatches";
import MiniMatchCard from "@/app/components/Match/MiniMatchCard";
import type { Swiper as SwiperType } from 'swiper';
import MiniMatchCardSkeleton from "@/app/components/Skeletons/MiniMatchCardSkeleton";

interface KommandeMatcherProps {
    maxMatches?: number;
}

export default function KommandeMatcher({ maxMatches = 3 }: KommandeMatcherProps) {
    const [matches, setMatches] = useState<MatchCardData[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Refs for navigation
    const prevRef = useRef<HTMLButtonElement>(null);
    const nextRef = useRef<HTMLButtonElement>(null);
    const [swiperReady, setSwiperReady] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch league cache data
                const response = await fetch('/api/discover-leagues');
                const cacheData = await response.json();

                if (!cacheData.success || !cacheData.data) {
                    setError("Kunde inte ladda ligainformation.");
                    setMatches([]);
                    return;
                }

                const { teamId, leagues } = cacheData.data;

                // Get current year for latest season
                const currentYear = new Date().getFullYear().toString();

                // Get leagues from latest season (current year)
                const latestSeasonLeagues = leagues.filter((l: any) => l.seasonYear === currentYear);

                // If no leagues for current year, use most recent season
                const seasonsAvailable = [...new Set(leagues.map((l: any) => l.seasonYear))].sort((a: string, b: string) => Number(b) - Number(a));
                const targetSeason = latestSeasonLeagues.length > 0 ? currentYear : seasonsAvailable[0];
                const targetLeagues = leagues.filter((l: any) => l.seasonYear === targetSeason);

                if (targetLeagues.length === 0) {
                    setError("Inga ligor hittades för aktuell säsong.");
                    setMatches([]);
                    return;
                }

                // Extract league IDs and use the first league's team ID
                const leagueIds = targetLeagues.map((l: any) => l.leagueId);
                const smcTeamId = targetLeagues[0]?.ostersTeamId || teamId;

                if (!smcTeamId) {
                    setError("Ogiltigt lag-ID.");
                    setMatches([]);
                    return;
                }

                const homeTeamId = smcTeamId;
                const awayTeamId = smcTeamId;

                const data = await getMatches(leagueIds, homeTeamId, awayTeamId);

                // Debug: Log all match statuses
                console.log('📊 All matches:', data.length);
                console.log('📊 Match statuses:', data.map(m => m.status));
                console.log('📊 Upcoming matches:', data.filter(m => m.status === "Scheduled").length);

                const now = new Date();

                const filteredMatches = data
                    .filter((match) => {
                        // Include scheduled matches and in-progress matches
                        if (match.status === "Scheduled" || match.status === "In progress") {
                            // For scheduled matches, ensure kickoff is in the future
                            if (match.status === "Scheduled") {
                                const kickoffDate = new Date(match.kickoff);
                                return kickoffDate > now;
                            }
                            return true; // Always include in-progress matches
                        }
                        return false;
                    })
                    .sort(
                        (a, b) =>
                            new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
                    )
                    .slice(0, maxMatches);

                console.log('✅ Filtered upcoming matches to show:', filteredMatches.length);

                setMatches(filteredMatches);
                setSwiperReady(true);
            } catch (err) {
                console.error("Error fetching upcoming matches:", err);
                setError("Kunde inte ladda matcher.");
                setMatches([]);
            }
        }

        fetchData();
    }, [maxMatches]);

    // If no matches available, display nothing
    if (matches.length === 0 && !error) {
        return null;
    }

    return (
        <div className="bg-custom_dark_dark_red flex flex-col gap-4 w-full py-2 relative overflow-hidden w-[1500px] max-w-full">
            <h2 className="text-4xl font-bold mb-8 text-left text-white">
                Kommande matcher
            </h2>
            <div className="relative overflow-visible">
                {/* Custom Navigation Buttons */}
                <button
                    ref={prevRef}
                    className="swiper-upcoming-button-prev absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md disabled:opacity-0"
                    aria-label="Föregående"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>

                <button
                    ref={nextRef}
                    className="swiper-upcoming-button-next absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md disabled:opacity-0"
                    aria-label="Nästa"
                >
                    <ArrowRight className="w-5 h-5 text-gray-700" />
                </button>

                {matches.length === 0 && !error ? (
                    <div className="flex flex-row flex-nowrap gap-10">
                        {[...Array(3)].map((_, i) => (
                            <MiniMatchCardSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-500 text-white p-4 rounded-md text-center">
                        {error}
                    </div>
                ) : swiperReady ? (
                    <Swiper
                        modules={[Navigation]}
                        spaceBetween={16}
                        slidesPerView={1.2}
                        navigation={{
                            nextEl: nextRef.current,
                            prevEl: prevRef.current,
                        }}
                        onBeforeInit={(swiper: SwiperType) => {
                            if (
                                swiper.params.navigation &&
                                typeof swiper.params.navigation !== 'boolean'
                            ) {
                                swiper.params.navigation.prevEl = prevRef.current;
                                swiper.params.navigation.nextEl = nextRef.current;
                            }
                        }}

                        breakpoints={{
                            1224: { slidesPerView: 4 },
                            768: { slidesPerView: 3.5 },
                            500: { slidesPerView: 2.3 },
                            450: { slidesPerView: 2.3 },
                        }}
                    >
                        {matches.map((match) => (
                            <SwiperSlide
                                key={match.matchId}
                            >
                                <MiniMatchCard
                                    match={match}
                                    colorTheme="red"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : null}
            </div>
        </div>
    );
}
