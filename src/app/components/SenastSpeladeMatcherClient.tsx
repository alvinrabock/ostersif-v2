"use client";

import React from "react";
import { MatchCardData } from "@/types";
import MiniMatchCard from "@/app/components/Match/MiniMatchCard";
import { Button } from "./ui/Button";
import Link from "next/link";

interface SenastSpeladeMatcherClientProps {
    matches: MatchCardData[];
}

/**
 * Client component that renders played matches in a grid layout
 * No polling needed - finished matches are static
 */
export default function SenastSpeladeMatcherClient({ matches }: SenastSpeladeMatcherClientProps) {
    if (matches.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 w-full rounded-md">
            <h2 className="text-3xl font-bold mb-4 text-left text-white">Senast spelade matcher</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {matches.map((match) => (
                    <MiniMatchCard
                        key={match.cmsId || match.externalMatchId || match.matchId}
                        match={match}
                        colorTheme="red"
                    />
                ))}
            </div>
            <Button variant="outline" className="text-left w-fit">
                <Link href="/matcher">Visa alla matcher</Link>
            </Button>
        </div>
    );
}
