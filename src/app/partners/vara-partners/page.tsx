import React from "react";
import Link from "next/link";
import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import { fetchAllPartnernivaerandPartners } from "@/lib/apollo/fetchPartnernivaer/fetchPartnernivaerandpartnersAction";
import { Media } from "@/app/components/Media/index";
import { Partner, Partnernivaer } from "@/types";

// Partner logo component optimized for server rendering
const PartnerLogo = ({ partner }: { partner: Partner }) => {
    const content = partner.logotype ? (
        <div className="transition-transform duration-200 group-hover:scale-105">
            <Media
                resource={partner.logotype}
                size="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 20vw"
                alt={partner.title}
                imgClassName="p-4 object-contain w-full h-auto max-w-[180px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[240px] mx-auto min-h-[120px]"
                loading="lazy"
            />
        </div>
    ) : (
        <span className="text-white/80 font-bold text-sm text-left transition-colors group-hover:text-white">
            {partner.title}
        </span>
    );

    if (partner.link) {
        return (
            <Link
                href={partner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center group"
                prefetch={false}
            >
                {content}
            </Link>
        );
    }

    return (
        <div className="flex items-center justify-center">
            {content}
        </div>
    );
};

// Partner grid component
const PartnerGrid = ({ partners }: { partners: Partner[] }) => {
    // Sort partners at render time (server-side)
    const sortedPartners = partners.sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10">
            {sortedPartners.map((partner) => (
                <PartnerLogo key={partner.id} partner={partner} />
            ))}
        </div>
    );
};

export default async function Page() {
    const partnernivaer: Partnernivaer[] = await fetchAllPartnernivaerandPartners();

    if (!partnernivaer || partnernivaer.length === 0) {
        return <div>No partner levels found.</div>;
    }

    // Sort partner levels by publishedAt descending (server-side)
    const sortedPartnernivaer = [...partnernivaer].sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
    });

    return (
        <div className="w-full py-46 bg-custom_dark_dark_red text-white">
            <MaxWidthWrapper>
                <h1 className="text-5xl mb-14 text-center font-bold">Våra partners</h1>

                {sortedPartnernivaer.map((level) => {
                    // Filter out strings and keep only Partner objects
                    const validPartners = level.koppladepartners?.docs?.filter(
                        (partner): partner is Partner => typeof partner !== 'string'
                    ) || [];

                    return (
                        <section key={level.id} className="mb-22 w-full">
                            <h2 className="text-3xl text-center font-semibold mb-10">{level.title}</h2>

                            {validPartners.length > 0 ? (
                                <PartnerGrid partners={validPartners} />
                            ) : (
                                <p className="text-gray-500 italic">Inga kopplade partners.</p>
                            )}
                        </section>
                    );
                })}
            </MaxWidthWrapper>
        </div>
    );
}