'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { MatchCardData } from '@/types';
import { SeasonGroup } from '@/lib/leagueCache';
import { getFilteredMatches } from '@/lib/getMatchesWithFallback';

import MatchCard from '../components/Match/MatchCard';
import { MatchCardSkeleton } from '../components/Skeletons/MatchCardSkeleton';

import { Button } from '../components/ui/Button';
import MatchFilter from './MatchFilters';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../../components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import CalenderIcon from '../components/Icons/CalenderIcon';
import { MatchCalendar } from './MatchCalendar';
import { SortIcon } from '../components/Icons/SortIcon';

interface MatchFiltersProps {
    seasons: SeasonGroup[];
    initialMatches?: MatchCardData[];
}

const MatchArchive: React.FC<MatchFiltersProps> = ({ seasons, initialMatches = [] }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const isPlayedFilter = searchParams.get('status') === 'Over';
    const locationFilter = searchParams.get('location');
    const leagueFilter = searchParams.get('league');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const seasonFilter = searchParams.get('season');

    // Use initial matches if no filters are applied, avoiding initial fetch
    const hasFilters = isPlayedFilter || locationFilter || leagueFilter || dateFromParam || dateToParam || seasonFilter;
    const [matches, setMatches] = useState<MatchCardData[]>(hasFilters ? [] : initialMatches);
    const [loading, setLoading] = useState(hasFilters ? true : false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => {
        if (dateFromParam && dateToParam) {
            return {
                from: parseISO(dateFromParam),
                to: parseISO(dateToParam),
            };
        }
        return undefined;
    });

    // Season options directly from cache
    const seasonOptions = seasons.map(s => ({
        seasonYear: s.seasonYear,
        tournaments: s.tournaments
    }));

    // Current year is always the default/latest season (e.g., 2026)
    const currentYear = new Date().getFullYear().toString();
    const defaultSeason = seasons[0]?.seasonYear || currentYear;
    const selectedSeason = seasonFilter || defaultSeason;

    // League options for selected season
    const leagueOptions = selectedSeason
        ? seasons
            .find(s => s.seasonYear === selectedSeason)
            ?.tournaments.map(t => ({
                id: String(t.leagueId),
                name: t.LeagueName,
            })) || []
        : [];

    // Check if we can use initialMatches (optimization)
    // initialMatches are for the current year, so we can use them if:
    // - No filters at all, OR
    // - Only season filter is set AND it matches current year
    const onlySeasonFilter = seasonFilter && !isPlayedFilter && !locationFilter && !leagueFilter && !dateFromParam && !dateToParam;
    const canUseInitialMatches = (!hasFilters || (onlySeasonFilter && seasonFilter === currentYear)) && initialMatches.length > 0;

    useEffect(() => {
        // When we can use initialMatches, skip fetching
        if (canUseInitialMatches) {
            setMatches(initialMatches);
            setLoading(false);
            return;
        }

        const fetchMatchesInternal = async () => {
            // Only show loading skeleton if we have NO data at all
            if (matches.length === 0) {
                setLoading(true);
            }

            try {
                const filteredMatches = await getFilteredMatches({
                    status: isPlayedFilter ? 'played' : undefined,
                    dateFrom: dateFromParam || (selectedRange?.from ? format(selectedRange.from, 'yyyy-MM-dd') : undefined),
                    dateTo: dateToParam || (selectedRange?.to ? format(selectedRange.to, 'yyyy-MM-dd') : undefined),
                    season: selectedSeason,
                    location: locationFilter as 'home' | 'away' | undefined,
                    leagueId: leagueFilter || undefined,
                    limit: 200,
                });

                setMatches(filteredMatches);
            } catch (error) {
                console.error('Error fetching matches:', error);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMatchesInternal();
    }, [seasons, isPlayedFilter, locationFilter, leagueFilter, selectedRange, dateFromParam, dateToParam, selectedSeason, canUseInitialMatches, initialMatches]);


    const updateQueryParam = (key: string, value?: string) => {
        const current = new URLSearchParams(searchParams.toString());
        if (value === undefined || current.get(key) === value) {
            current.delete(key);
        } else {
            current.set(key, value);
        }
        router.push(`/matcher?${current.toString()}`);
    };

    const handlePlayedFilterClick = () => updateQueryParam('status', 'Over');
    const handleLocationFilterClick = (value: 'home' | 'away') => updateQueryParam('location', value);
    const handleLeagueChange = (value: string) => updateQueryParam('league', value === 'clear' ? undefined : value);
    const handleSeasonChange = (value: string) => {
        const current = new URLSearchParams(searchParams.toString());
        if (value) current.set('season', value);
        else current.delete('season');
        current.delete('league');
        router.push(`/matcher?${current.toString()}`);
    };

    const handleDateChange = (range: DateRange | undefined) => {
        setSelectedRange(range);
        const current = new URLSearchParams(searchParams.toString());

        if (range?.from) current.set('dateFrom', format(range.from, 'yyyy-MM-dd'));
        else current.delete('dateFrom');

        if (range?.to) current.set('dateTo', format(range.to, 'yyyy-MM-dd'));
        else current.delete('dateTo');

        router.push(`/matcher?${current.toString()}`);
        if (range?.from && range?.to) setCalendarOpen(false);
    };

    const handleClearFilters = () => {
        router.push('/matcher');
        setSelectedRange(undefined);
    };

    const hasAnyFilter = searchParams.toString().length > 0;

    const getHeadingText = () => {
        if (isPlayedFilter) return 'Spelade matcher';
        if (leagueFilter) {
            const league = leagueOptions.find(league => league.id === leagueFilter);
            return league ? league.name : leagueFilter;
        }
        if (locationFilter) return `${locationFilter === 'home' ? 'Hemma' : 'Borta'}matcher`;
        return 'Kommande matcher';
    };

    // OPTIMIZATION 3: Memoize league name lookups to avoid recalculating on every render
    const leagueNameMap = useMemo(() => {
        const map = new Map<string, string>();
        seasons.forEach(s => {
            s.tournaments.forEach(t => {
                map.set(String(t.leagueId), t.LeagueName);
            });
        });
        return map;
    }, [seasons]);

    return (
        <div className="space-y-6 text-white">
            <h1 className="text-6xl font-bold mb-6">{getHeadingText()}</h1>
            <div className='flex flex-wrap xl:flex-nowrap gap-4 xl:gap-10 flex-row items-center justify-between  border-t pt-6 mt-6 border-slate-400 pt-4'>
                <div className='grid grid-cols-2 xl:flex w-full gap-4 justify-between'>
                    <div>
                        <Button
                            variant={isPlayedFilter ? 'white' : 'outline'}
                            onClick={handlePlayedFilterClick}
                            className={`text-xs sm:text-sm w-full xl:w-fit ${isPlayedFilter ? '' : 'text-white'}`}
                        >
                            Visa spelade matcher
                        </Button>
                    </div>

                    {/* === Desktop static sidebar === */}
                    <div className="hidden xl:block">
                        <MatchFilter
                            isPlayedFilter={isPlayedFilter}
                            locationFilter={locationFilter}
                            leagueFilter={leagueFilter}
                            selectedSeason={selectedSeason}
                            seasonOptions={seasonOptions}
                            leagueOptions={leagueOptions}
                            calendarOpen={calendarOpen}
                            selectedRange={selectedRange}
                            setCalendarOpen={setCalendarOpen}
                            handlePlayedFilterClick={handlePlayedFilterClick}
                            handleLocationFilterClick={handleLocationFilterClick}
                            handleLeagueChange={handleLeagueChange}
                            handleSeasonChange={handleSeasonChange}
                            handleDateChange={handleDateChange}
                        />
                    </div>

                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={`p-2 text-xs sm:text-sm flex gap-2 items-center ${calendarOpen ? "!bg-custom_white bg-white/20   " : ""
                                    }`}
                            >
                                <CalenderIcon className=" hidden xs:block h-2 w-2 sm:h-4 sm:w-4" />
                                {selectedRange?.from && selectedRange?.to
                                    ? `${format(selectedRange.from, 'yyyy-MM-dd')} – ${format(selectedRange.to, 'yyyy-MM-dd')}`
                                    : 'Välj datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto bg-custom_dark_dark_red border-slate-400 text-white"
                            side="bottom"
                            align="start"
                            avoidCollisions
                            sideOffset={8} // adds space from the trigger
                        >
                            <MatchCalendar
                                mode="range"
                                defaultMonth={selectedRange?.from}
                                selected={selectedRange}
                                onSelect={handleDateChange}
                                numberOfMonths={2}
                                className="text-white"
                                matches={matches}
                            />
                        </PopoverContent>

                    </Popover>
                </div>

                {/* === Mobile filter trigger with Drawer === */}
                <div className="w-full xl:hidden">
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="outline" className='w-full flex flex-row items-center'>
                                <SortIcon className='w-4 h-4' />
                                Fler filter
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="p-4 space-y-4 bg-custom_dark_dark_red border-none">
                            <DrawerHeader className='p-0'>
                                <DrawerTitle className="text-white">Fler filter</DrawerTitle>
                            </DrawerHeader>

                            <MatchFilter
                                isPlayedFilter={isPlayedFilter}
                                locationFilter={locationFilter}
                                leagueFilter={leagueFilter}
                                selectedSeason={selectedSeason}
                                seasonOptions={seasonOptions}
                                leagueOptions={leagueOptions}
                                calendarOpen={calendarOpen}
                                selectedRange={selectedRange}
                                setCalendarOpen={setCalendarOpen}
                                handlePlayedFilterClick={handlePlayedFilterClick}
                                handleLocationFilterClick={handleLocationFilterClick}
                                handleLeagueChange={handleLeagueChange}
                                handleSeasonChange={handleSeasonChange}
                                handleDateChange={handleDateChange}

                            />

                            <DrawerFooter className='p-0'>
                                <DrawerClose>
                                    <Button variant="default" className='w-full'>Visa resultat</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </div>
            </div>

            <div className="mt-4">
                {hasAnyFilter && (
                    <Button
                        variant="ghost"
                        onClick={handleClearFilters}
                        className="text-sm underline text-white flex items-center gap-1 mb-4"
                    >
                        <span aria-hidden="true" className="font-bold">×</span> Rensa filter
                    </Button>

                )}

                {loading ? (
                    <ul className="space-y-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <MatchCardSkeleton key={index} />
                        ))}
                    </ul>
                ) : matches.length > 0 ? (
                    <ul className="grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-1  gap-6">
                        {matches.map(match => {
                            // Prefer leagueName from CMS, fallback to memoized lookup
                            const leagueName = match.leagueName || leagueNameMap.get(String(match.leagueId));

                            return (
                                <li key={match.cmsId || match.matchId}>
                                    <MatchCard match={match} colorTheme="red" leagueName={leagueName} />
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p>Inga matcher hittades.</p>
                )}
            </div>
        </div>
    );
};

export default MatchArchive;
