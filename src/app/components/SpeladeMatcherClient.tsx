"use client";

import React, { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { MatchCardData } from "@/types";
import MiniMatchCard from "@/app/components/Match/MiniMatchCard";
import type { Swiper as SwiperType } from 'swiper';

interface SpeladeMatcherClientProps {
    matches: MatchCardData[];
}

/**
 * Client component that renders the played matches Swiper
 * No live updates needed - finished matches are static
 */
export default function SpeladeMatcherClient({ matches }: SpeladeMatcherClientProps) {
    const prevRef = useRef<HTMLButtonElement>(null);
    const nextRef = useRef<HTMLButtonElement>(null);
    const [swiperReady, setSwiperReady] = useState(false);

    // Trigger Swiper render after navigation buttons are mounted
    React.useEffect(() => {
        setSwiperReady(true);
    }, []);

    if (matches.length === 0) {
        return null;
    }

    return (
        <div className="relative overflow-visible">
            {/* Custom Navigation Buttons */}
            <button
                ref={prevRef}
                className="swiper-played-button-prev absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md disabled:opacity-0"
                aria-label="Föregående"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>

            <button
                ref={nextRef}
                className="swiper-played-button-next absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md disabled:opacity-0"
                aria-label="Nästa"
            >
                <ArrowRight className="w-5 h-5 text-gray-700" />
            </button>

            {swiperReady && (
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
                        <SwiperSlide key={match.matchId}>
                            <MiniMatchCard
                                match={match}
                                colorTheme="outline"
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}
        </div>
    );
}
