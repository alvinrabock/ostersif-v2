import React, { Suspense } from "react";
import KommandeMatcherServer from "@/app/components/KommandeMatcherServer";
import { MatchCardSkeleton } from "@/app/components/Skeletons/MatchCardSkeleton";

// Loading skeleton shown while matches are being fetched
function KommandeMatcherSkeleton() {
    return (
        <div className="w-full flex flex-col gap-4 z-20 relative">
            {[...Array(3)].map((_, i) => (
                <MatchCardSkeleton key={i} />
            ))}
        </div>
    );
}

export default function KommandeMatcherBlock() {
    return (
        <Suspense fallback={<KommandeMatcherSkeleton />}>
            <KommandeMatcherServer maxMatches={3} />
        </Suspense>
    );
}
