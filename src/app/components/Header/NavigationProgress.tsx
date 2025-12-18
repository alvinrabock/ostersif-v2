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
    const startPathRef = useRef<string | null>(null);

    // Complete the progress bar when pathname changes (navigation done)
    useEffect(() => {
        // Only complete if we were loading AND pathname actually changed
        if (isLoading && startPathRef.current && pathname !== startPathRef.current) {
            setProgress(100);
            const timer = setTimeout(() => {
                setIsLoading(false);
                setProgress(0);
                startPathRef.current = null;
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pathname, isLoading]);

    // Safety timeout - auto-complete after 5 seconds max to prevent stuck state
    useEffect(() => {
        if (isLoading) {
            const safetyTimer = setTimeout(() => {
                setProgress(100);
                setTimeout(() => {
                    setIsLoading(false);
                    setProgress(0);
                    startPathRef.current = null;
                }, 300);
            }, 5000);

            return () => clearTimeout(safetyTimer);
        }
    }, [isLoading]);

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
            // Don't show loader for same page
            if (href === pathname) return;

            // Track starting path and start loading
            startPathRef.current = pathname;
            setIsLoading(true);
            setProgress(20);

            // Animate progress
            setTimeout(() => setProgress(50), 100);
            setTimeout(() => setProgress(70), 300);
            setTimeout(() => setProgress(85), 600);
        }
    }, [pathname]);

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
