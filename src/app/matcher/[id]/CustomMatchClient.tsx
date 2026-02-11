"use client";

import React from 'react';
import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import MatchHero from '@/app/components/Heros/MatchHero';
import { Match } from '@/types';
import { Button } from '@/app/components/ui/Button';
import TicketIcon from '@/app/components/Icons/TicketIcon';
import CalenderIcon from '@/app/components/Icons/CalenderIcon';
import { FootballFieldIcon } from '@/app/components/Icons/FootballFieldIcon';

interface CustomMatchClientProps {
    matchDetails: Match;
}

export default function CustomMatchClient({ matchDetails }: CustomMatchClientProps) {
    const formatDate = (dateString: string) => {
        if (!dateString) return { date: 'Datum ej satt', time: 'TBD' };
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return { date: 'Datum ej satt', time: 'TBD' };

        const date = dateObj.toLocaleDateString("sv-SE", {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const time = dateObj.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

        return { date, time: time === '00:00' ? 'TBD' : time };
    };

    const { date: formattedDate, time: formattedTime } = formatDate(matchDetails.kickoff);
    const isFinished = matchDetails.status === 'Over';
    const isScheduled = matchDetails.status === 'Scheduled';

    return (
        <>
            {/* Match Hero with teams and score */}
            <MatchHero
                matchDetails={matchDetails}
                matchPhaseData={null}
                liveStats={null}
            />

            <MaxWidthWrapper>
                <div className="py-8 space-y-8">
                    {/* Match Info Card */}
                    <div className="bg-custom-dark-red rounded-xl p-6 text-white">
                        <h2 className="text-2xl font-bold mb-6">Matchinformation</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Date & Time */}
                            <div className="flex items-start gap-4">
                                <CalenderIcon className="w-6 h-6 text-white/70 mt-1" />
                                <div>
                                    <p className="text-white/70 text-sm">Datum & Tid</p>
                                    <p className="font-semibold capitalize">{formattedDate}</p>
                                    <p className="text-lg">{formattedTime}</p>
                                </div>
                            </div>

                            {/* Arena */}
                            {matchDetails.arenaName && (
                                <div className="flex items-start gap-4">
                                    <FootballFieldIcon className="w-6 h-6 text-white/70 mt-1" />
                                    <div>
                                        <p className="text-white/70 text-sm">Arena</p>
                                        <p className="font-semibold">{matchDetails.arenaName}</p>
                                    </div>
                                </div>
                            )}

                            {/* League */}
                            {matchDetails.leagueName && (
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 flex items-center justify-center text-white/70">
                                        <span className="text-lg">🏆</span>
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-sm">Tävling</p>
                                        <p className="font-semibold">{matchDetails.leagueName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Status */}
                            <div className="flex items-start gap-4">
                                <div className="w-6 h-6 flex items-center justify-center text-white/70">
                                    <span className="text-lg">{isFinished ? '✓' : '📅'}</span>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm">Status</p>
                                    <p className="font-semibold">
                                        {isFinished ? 'Avslutad' : isScheduled ? 'Kommande' : 'Pågående'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Score for finished matches */}
                        {isFinished && (matchDetails.goalsHome !== undefined || matchDetails.goalsAway !== undefined) && (
                            <div className="mt-6 pt-6 border-t border-white/20">
                                <p className="text-white/70 text-sm mb-2">Slutresultat</p>
                                <div className="flex items-center justify-center gap-4 text-4xl font-bold">
                                    <span>{matchDetails.homeTeam}</span>
                                    <span className="bg-white/10 px-4 py-2 rounded-lg">
                                        {matchDetails.goalsHome ?? 0} - {matchDetails.goalsAway ?? 0}
                                    </span>
                                    <span>{matchDetails.awayTeam}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Ticket Button */}
                        {matchDetails.ticketURL && isScheduled && (
                            <a href={matchDetails.ticketURL} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button variant="default" className="w-full flex items-center justify-center gap-2 py-6">
                                    <TicketIcon className="w-5 h-5" />
                                    Köp biljetter
                                </Button>
                            </a>
                        )}

                        {/* Custom CTA Button */}
                        {matchDetails.customButtonText && matchDetails.customButtonLink && (
                            <a href={matchDetails.customButtonLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button variant="outline" className="w-full py-6">
                                    {matchDetails.customButtonText}
                                </Button>
                            </a>
                        )}
                    </div>

                    {/* Note about custom game */}
                    <div className="text-center text-white/50 text-sm">
                        <p>Detta är en manuellt tillagd match.</p>
                    </div>
                </div>
            </MaxWidthWrapper>
        </>
    );
}
