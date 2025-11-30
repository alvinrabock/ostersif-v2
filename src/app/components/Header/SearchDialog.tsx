'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '../ui/dialog';
import { Post } from '@/types';
import MiniNyheterItem from '../Nyheter/miniNyheterItem';

function SearchResultSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-4 items-center animate-pulse">
            <div className="aspect-video w-full bg-white/20 rounded-md" />
            <div className="col-span-2 space-y-2">
                <div className="h-4 bg-white/20 rounded w-full" />
                <div className="h-4 bg-white/20 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/4 mt-2" />
            </div>
        </div>
    );
}

export function SearchDialog() {
    const [searchValue, setSearchValue] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Post[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Set loading immediately when we have a valid search term
        if (searchValue.length > 2) {
            setLoading(true);
            setError(null);
        } else {
            setData([]);
            setLoading(false);
            return;
        }

        const searchPosts = async () => {
            try {
                // Use API route instead of direct server call
                const response = await fetch(`/api/nyheter/search?q=${encodeURIComponent(searchValue)}&limit=50`);
                const result = await response.json();
                if (result.error) {
                    throw new Error(result.error);
                }
                setData(result.posts || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Search failed');
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(searchPosts, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [searchValue]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 p-2! text-white"
                >
                    <Search className="w-16 h-16" />
                    <span className="sr-only">Sök</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="p-6 text-white w-screen md:max-w-7xl h-screen md:h-fit max-w-none max-h-none bg-custom_dark_dark_red border-none flex flex-col">
                <DialogHeader className="relative p-4 flex flex-row justify-between items-center p-0 py-2">
                    <DialogTitle className="text-white text-left sr-only">Sök</DialogTitle>
                    <DialogDescription className="sr-only">
                        Sök efter artiklar & annat som du söker efter på vår hemsida
                    </DialogDescription>
                </DialogHeader>

                {/* Search input */}
                <div className="relative w-full bg-transparent border rounded-md flex items-center pr-24">
                    <input
                        type="text"
                        placeholder="Vad letar du efter?"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="flex-1 p-4 text-lg bg-transparent border-none focus:outline-none text-white placeholder:text-white/50"
                    />
                    {searchValue && (
                        <button
                            onClick={() => setSearchValue('')}
                            className="absolute right-20 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                            aria-label="Rensa sökning"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setOpen(false)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/80 hover:text-white font-medium"
                    >
                        Avbryt
                    </button>
                </div>

                {/* Results */}
                <div className="flex flex-col mt-6 overflow-y-auto gap-10 max-h-96">
                    {loading && (
                        <>
                            <SearchResultSkeleton />
                            <SearchResultSkeleton />
                            <SearchResultSkeleton />
                        </>
                    )}
                    {error && <p className="text-red-500">Error: {error}</p>}
                    {!loading && !error && data.length === 0 && searchValue.length > 2 && <p>Inga resultat</p>}
                    {!loading && data.map((post: Post) => (
                        <MiniNyheterItem key={post.id} post={post} closeDialog={() => setOpen(false)} />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
