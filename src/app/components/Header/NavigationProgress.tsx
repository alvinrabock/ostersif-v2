"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin progress bar that appears at the top during navigation.
 * Intercepts link clicks to show loading immediately.
 */
export function NavigationProgress() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Use refs for timers to avoid stale closure issues
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const startPathRef = useRef<string | null>(null);

    // Cleanup all timers
    const clearAllTimers = useCallback(() => {
        if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }
        if (completeTimerRef.current) {
            clearTimeout(completeTimerRef.current);
            completeTimerRef.current = null;
        }
        progressTimersRef.current.forEach(t => clearTimeout(t));
        progressTimersRef.current = [];
    }, []);

    // Complete the loading animation
    const completeLoading = useCallback(() => {
        clearAllTimers();
        setProgress(100);
        completeTimerRef.current = setTimeout(() => {
            setIsLoading(false);
            setProgress(0);
            startPathRef.current = null;
        }, 300);
    }, [clearAllTimers]);

    // When pathname changes, complete loading if we were navigating
    useEffect(() => {
        if (isLoading && startPathRef.current && pathname !== startPathRef.current) {
            completeLoading();
        }
    }, [pathname, isLoading, completeLoading]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    // Start loading when a link is clicked
    const handleClick = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const href = anchor.getAttribute("href");

        // Only handle internal navigation links
        if (
            href &&
            href.startsWith("/") &&
            !href.startsWith("//") &&
            !anchor.hasAttribute("download") &&
            anchor.target !== "_blank" &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.shiftKey
        ) {
            // Don't show loader for same page or hash links
            if (href === pathname || href.startsWith("#")) return;

            // Clear any existing timers first
            clearAllTimers();

            // Track starting path and start loading
            startPathRef.current = pathname;
            setIsLoading(true);
            setProgress(20);

            // Animate progress
            progressTimersRef.current = [
                setTimeout(() => setProgress(50), 100),
                setTimeout(() => setProgress(70), 300),
                setTimeout(() => setProgress(85), 600),
            ];

            // Safety timeout - ALWAYS complete after 3 seconds
            safetyTimerRef.current = setTimeout(() => {
                completeLoading();
            }, 3000);
        }
    }, [pathname, clearAllTimers, completeLoading]);

    useEffect(() => {
        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, [handleClick]);

    if (!isLoading && progress === 0) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
            <div
                className="h-full bg-white transition-all ease-out"
                style={{
                    width: `${progress}%`,
                    transitionDuration: progress === 100 ? "200ms" : "400ms",
                }}
            />
        </div>
    );
}
