'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { getAvailableSeasons } from '@/lib/season';
import { CalendarDays } from 'lucide-react';

interface SeasonSelectorProps {
    currentSeason: string;
    className?: string;
}

export default function SeasonSelector({ currentSeason, className = '' }: SeasonSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const availableSeasons = getAvailableSeasons();

    const handleSeasonChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSeason = e.target.value;
        const params = new URLSearchParams(searchParams.toString());

        if (newSeason === availableSeasons[0]) {
            // If selecting latest season, remove the param (use default)
            params.delete('season');
        } else {
            params.set('season', newSeason);
        }

        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;

        router.push(newUrl, { scroll: false });
    }, [router, searchParams, pathname, availableSeasons]);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <CalendarDays className="w-5 h-5 text-white/70" />
            <label htmlFor="season-selector" className="text-white/70 text-sm font-medium">
                Säsong:
            </label>
            <select
                id="season-selector"
                value={currentSeason}
                onChange={handleSeasonChange}
                className="bg-custom_dark_red text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 hover:border-white/40 transition-colors cursor-pointer"
            >
                {availableSeasons.map((season) => (
                    <option key={season} value={season}>
                        {season}
                    </option>
                ))}
            </select>
        </div>
    );
}
