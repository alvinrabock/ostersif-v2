import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import { fetchSingleLag, type FrontspaceLag } from "@/lib/frontspace/adapters/lag";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import type { Metadata } from 'next';

type PageProps = {
    params: Promise<{ slug: string }>;
};

// Generate dynamic metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    try {
        const teamData = await fetchSingleLag(slug);

        if (!teamData) {
            return {
                title: 'Lag hittades inte - Östers IF',
                description: 'Det begärda laget kunde inte hittas.',
            };
        }

        const description = `${teamData.title} inom Östers IF. Se information om ${teamData.title}.`;

        return {
            title: `${teamData.title} - Östers IF`,
            description,
            keywords: `${teamData.title}, Östers IF, fotboll, Växjö, Sverige, lag`,
            openGraph: {
                title: `${teamData.title} - Östers IF`,
                description,
                type: 'website',
                locale: 'sv_SE',
                siteName: 'Östers IF',
                ...(teamData.content.omslagsbild && {
                    images: [{
                        url: teamData.content.omslagsbild,
                        alt: `${teamData.title} lagbild`,
                        width: 1200,
                        height: 630,
                    }]
                }),
            },
            alternates: {
                canonical: `/lag/${slug}`,
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Lag - Östers IF',
            description: 'Lagsida för Östers IF',
        };
    }
}

export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    // Fetch team data from Frontspace
    const teamData: FrontspaceLag | null = await fetchSingleLag(slug);
    if (!teamData) {
        notFound();
    }

    const hasImage = !!teamData.content.omslagsbild;
    const sportadminLink = teamData.content.sportadminlank;

    return (
        <main>
            {/* Hero Section */}
            <div className="relative w-full h-[50svh]">
                {hasImage && (
                    <img
                        src={teamData.content.omslagsbild}
                        alt={teamData.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-custom_dark_dark_red via-custom_dark_dark_red/70 to-custom_dark_dark_red/50 z-10" />

                <div className="absolute inset-0 z-20 flex items-center justify-start">
                    <MaxWidthWrapper>
                        <h1 className="text-white text-4xl md:text-6xl font-bold drop-shadow-md text-left mb-4">
                            {teamData.title}
                        </h1>
                        {sportadminLink && (
                            <a href={sportadminLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="red">
                                    Gå till Sportadmin
                                    <ArrowRight className="inline ml-2 w-4 h-4" />
                                </Button>
                            </a>
                        )}
                    </MaxWidthWrapper>
                </div>
            </div>

            {/* Content Section */}
            <div className="bg-custom_dark_dark_red py-20">
                <MaxWidthWrapper>
                    <div className="text-white text-center">
                        <p className="text-xl text-gray-300">
                            Mer information om {teamData.title} kommer snart.
                        </p>
                        {sportadminLink && (
                            <div className="mt-8">
                                <a
                                    href={sportadminLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-white hover:text-gray-300 underline"
                                >
                                    Se lagets sida på Sportadmin
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        )}
                    </div>
                </MaxWidthWrapper>
            </div>
        </main>
    );
}