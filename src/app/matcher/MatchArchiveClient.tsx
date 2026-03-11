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
    calendarLinks?: { label: string; url: string }[];
}

const MatchArchive: React.FC<MatchFiltersProps> = ({ seasons, initialMatches = [], calendarLinks: calendarLinksProp }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const isPlayedFilter = searchParams.get('status') === 'Over';
    const locationFilter = searchParams.get('location');
    const leagueFilter = searchParams.get('league');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const seasonFilter = searchParams.get('season');
    const genderFilter = searchParams.get('gender'); // 'herrar' | 'damer' | null

    // Use initial matches if no filters are applied, avoiding initial fetch
    const hasFilters = isPlayedFilter || locationFilter || leagueFilter || dateFromParam || dateToParam || seasonFilter || genderFilter;
    const [matches, setMatches] = useState<MatchCardData[]>(hasFilters ? [] : initialMatches);
    const [loading, setLoading] = useState(hasFilters ? true : false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);

    // Sync calendar state between desktop/mobile on resize
    useEffect(() => {
        const XL_BREAKPOINT = 1280; // Tailwind xl breakpoint

        const handleResize = () => {
            const isMobile = window.innerWidth < XL_BREAKPOINT;

            if (isMobile && calendarOpen) {
                setCalendarOpen(false);
                setMobileCalendarOpen(true);
            } else if (!isMobile && mobileCalendarOpen) {
                setMobileCalendarOpen(false);
                setCalendarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calendarOpen, mobileCalendarOpen]);

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

    // Tournaments for selected season
    const selectedSeasonTournaments = seasons.find(s => s.seasonYear === selectedSeason)?.tournaments || [];

    // Gender detection for the current season
    const hasHerrar = selectedSeasonTournaments.some(t => !t.kon || t.kon === 'herr');
    const hasDamer = selectedSeasonTournaments.some(t => t.kon === 'dam');

    // League IDs grouped by gender for client-side filtering (include altLeagueIds for cross-system matches)
    const herrarLeagueIds = useMemo(() => {
        const ids = new Set<string>();
        selectedSeasonTournaments.filter(t => !t.kon || t.kon === 'herr').forEach(t => {
            ids.add(String(t.leagueId));
            t.altLeagueIds?.forEach(id => ids.add(id));
        });
        return ids;
    }, [selectedSeasonTournaments]);
    const damerLeagueIds = useMemo(() => {
        const ids = new Set<string>();
        selectedSeasonTournaments.filter(t => t.kon === 'dam').forEach(t => {
            ids.add(String(t.leagueId));
            t.altLeagueIds?.forEach(id => ids.add(id));
        });
        return ids;
    }, [selectedSeasonTournaments]);

    // Calendar links from lag posts (passed from server) with fallback
    const calendarLinks = calendarLinksProp && calendarLinksProp.length > 0
        ? calendarLinksProp
        : [{ label: 'Herrar', url: 'webcal://calendar.sportomedia.se/team/OIF' }];

    // League options for selected season (filtered by gender if active)
    const leagueOptions = selectedSeasonTournaments
        .filter(t => {
            if (genderFilter === 'herrar') return !t.kon || t.kon === 'herr';
            if (genderFilter === 'damer') return t.kon === 'dam';
            return true;
        })
        .map(t => ({ id: String(t.leagueId), name: t.LeagueName }));

    // Check if we can use initialMatches (optimization)
    const onlySeasonFilter = seasonFilter && !isPlayedFilter && !locationFilter && !leagueFilter && !dateFromParam && !dateToParam && !genderFilter;
    const canUseInitialMatches = (!hasFilters || (onlySeasonFilter && seasonFilter === currentYear)) && initialMatches.length > 0;

    useEffect(() => {
        if (canUseInitialMatches) {
            setMatches(initialMatches);
            setLoading(false);
            return;
        }

        const fetchMatchesInternal = async () => {
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

    // Apply gender filter client-side (matches are already fetched for the season)
    const displayedMatches = useMemo(() => {
        if (!genderFilter) return matches;
        const ids = genderFilter === 'herrar' ? herrarLeagueIds : damerLeagueIds;
        return matches.filter(m => ids.has(String(m.leagueId)));
    }, [matches, genderFilter, herrarLeagueIds, damerLeagueIds]);

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
    const handleGenderFilterClick = (value: 'herrar' | 'damer') => updateQueryParam('gender', value);
    const handleSeasonChange = (value: string) => {
        const current = new URLSearchParams(searchParams.toString());
        if (value) current.set('season', value);
        else current.delete('season');
        current.delete('league');
        current.delete('gender');
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
        if (genderFilter === 'herrar') return 'Herrmatchar';
        if (genderFilter === 'damer') return 'Dammatcher';
        return 'Kommande matcher';
    };

    const leagueNameMap = useMemo(() => {
        const map = new Map<string, string>();
        seasons.forEach(s => {
            s.tournaments.forEach(t => {
                map.set(String(t.leagueId), t.LeagueName);
                t.altLeagueIds?.forEach(id => map.set(id, t.LeagueName));
            });
        });
        return map;
    }, [seasons]);

    const leagueGenderMap = useMemo(() => {
        const map = new Map<string, 'Herrar' | 'Damer'>();
        seasons.forEach(s => {
            s.tournaments.forEach(t => {
                const label = t.kon === 'dam' ? 'Damer' as const : 'Herrar' as const;
                map.set(String(t.leagueId), label);
                t.altLeagueIds?.forEach(id => map.set(id, label));
            });
        });
        return map;
    }, [seasons]);

    const sharedFilterProps = {
        isPlayedFilter,
        locationFilter,
        leagueFilter,
        genderFilter,
        selectedSeason,
        seasonOptions,
        leagueOptions,
        hasHerrar,
        hasDamer,
        calendarOpen,
        selectedRange,
        setCalendarOpen,
        handlePlayedFilterClick,
        handleLocationFilterClick,
        handleLeagueChange,
        handleSeasonChange,
        handleDateChange,
        handleGenderFilterClick,
    };

    return (
        <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h1 className="text-6xl font-bold">{getHeadingText()}</h1>
                <div className="flex gap-2">
                    {calendarLinks.map(link => (
                        <Button key={link.label} variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10 [&_svg]:fill-current">
                            <a href={link.url}>
                                <CalenderIcon className="h-4 w-4 shrink-0" />
                                Lägg till i kalender ({link.label})
                            </a>
                        </Button>
                    ))}
                </div>
            </div>
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
                        <MatchFilter {...sharedFilterProps} />
                    </div>

                    {/* Desktop: Popover with 2 months */}
                    <div className="hidden xl:block">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`p-2 text-xs sm:text-sm flex gap-2 items-center ${calendarOpen ? "!bg-custom_white bg-white/20" : ""}`}
                                >
                                    <CalenderIcon className="h-4 w-4" />
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
                                sideOffset={8}
                            >
                                <MatchCalendar
                                    mode="range"
                                    defaultMonth={selectedRange?.from}
                                    selected={selectedRange}
                                    onSelect={handleDateChange}
                                    numberOfMonths={2}
                                    className="text-white"
                                    matches={initialMatches}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Mobile/Tablet: Drawer with 1 month */}
                    <div className="xl:hidden w-full">
                        <Drawer open={mobileCalendarOpen} onOpenChange={setMobileCalendarOpen}>
                            <DrawerTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`p-2 text-xs sm:text-sm flex gap-2 items-center w-full ${mobileCalendarOpen ? "!bg-custom_white bg-white/20" : ""}`}
                                >
                                    <CalenderIcon className="h-4 w-4" />
                                    {selectedRange?.from && selectedRange?.to
                                        ? `${format(selectedRange.from, 'yyyy-MM-dd')} – ${format(selectedRange.to, 'yyyy-MM-dd')}`
                                        : 'Välj datum'}
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="p-4 bg-custom_dark_dark_red border-none max-h-[90vh]">
                                <DrawerHeader className="p-0 pt-4 pb-6 text-center">
                                    <DrawerTitle className="text-white text-2xl font-bold">Välj datumintervall</DrawerTitle>
                                </DrawerHeader>
                                <div className="flex-1 flex flex-col items-center justify-center overflow-auto py-4">
                                    <MatchCalendar
                                        mode="range"
                                        defaultMonth={selectedRange?.from}
                                        selected={selectedRange}
                                        onSelect={(range) => {
                                            handleDateChange(range);
                                            if (range?.from && range?.to) {
                                                setMobileCalendarOpen(false);
                                            }
                                        }}
                                        numberOfMonths={1}
                                        className="text-white"
                                        matches={initialMatches}
                                    />
                                </div>
                                <DrawerFooter className="p-0 pt-6">
                                    <DrawerClose asChild>
                                        <Button variant="outline" className="w-full text-white border-white hover:bg-white/10">Stäng</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </DrawerContent>
                        </Drawer>
                    </div>
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

                            <MatchFilter {...sharedFilterProps} />

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
                ) : displayedMatches.length > 0 ? (
                    <ul className="grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-1  gap-6">
                        {displayedMatches.map(match => {
                            const leagueName = match.leagueName || leagueNameMap.get(String(match.leagueId));
                            const genderLabel = leagueGenderMap.get(String(match.leagueId));
                            return (
                                <li key={match.cmsId || match.matchId}>
                                    <MatchCard match={match} colorTheme="red" leagueName={leagueName} genderLabel={genderLabel} />
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
