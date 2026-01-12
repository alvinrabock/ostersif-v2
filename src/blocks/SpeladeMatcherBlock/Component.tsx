import React, { Suspense } from "react";
import SpeladeMatcherServer from "@/app/components/SpeladeMatcherServer";
import MiniMatchCardSkeleton from "@/app/components/Skeletons/MiniMatchCardSkeleton";
import Image from "next/image";
import Link from "next/link";
import { Bell, Ticket, Play, Calendar, Trophy } from "lucide-react";

// Loading skeleton shown while matches are being fetched
function SpeladeMatcherSkeleton() {
    return (
        <div className="flex flex-row flex-nowrap gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
                <MiniMatchCardSkeleton key={i} />
            ))}
        </div>
    );
}

// App promotion section (static content, no data fetching)
function AppPromoSection() {
    return (
        <section className="w-full py-12 md:py-24 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Text + Features */}
                <div className="flex flex-col justify-center space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                            Allt du behöver för att följa klubben
                        </h2>
                        <p className="max-w-[600px] text-white/70 md:text-xl">
                            Få den ultimata fotbollsupplevelsen direkt i din telefon. Följ alla
                            matchhändelser, få exklusiva nyheter och ha din biljett alltid tillgänglig.
                        </p>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            {
                                icon: <Bell className="h-5 w-5" />,
                                title: 'Pushnotiser',
                                desc: 'Få de senaste nyheterna om klubben direkt till din telefon',
                            },
                            {
                                icon: <Ticket className="h-5 w-5" />,
                                title: 'Digital biljett',
                                desc: 'Scanna din biljett direkt från appen när du kommer till arenan',
                            },
                            {
                                icon: <Trophy className="h-5 w-5" />,
                                title: 'Live-uppdateringar',
                                desc: 'Följ alla matchhändelser i Allsvenskan i realtid med pushnotiser',
                            },
                            {
                                icon: <Play className="h-5 w-5" />,
                                title: 'Matchvideor',
                                desc: 'Se videohöjdpunkter från alla händelser efter omgången är färdigspelad',
                            },
                            {
                                icon: <Calendar className="h-5 w-5" />,
                                title: 'Schema & Tabell',
                                desc: 'Komplett spelschema, tabellställning och truppinformation',
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="flex items-start gap-3">
                                <div className="flex h-8 w-8 p-2 items-center justify-center rounded-lg bg-custom_red">
                                    {icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="text-sm text-white/70">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* App Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://apps.apple.com/se/app/%C3%B6sters-if-live/id1219207321?l=en-GB"
                        >
                            <Image
                                src="/Download_on_the_App_Store_Badge_SE_RGB_blk_100317.svg"
                                alt="App Store"
                                width={140}
                                height={50}
                            />
                        </Link>
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://play.google.com/store/apps/details?id=com.connectedleague.club.osters&pcampaignid=web_share"
                        >
                            <Image
                                src="/ladda-ned-google-play.svg"
                                alt="Google Play"
                                width={150}
                                height={50}
                            />
                        </Link>
                    </div>
                </div>

                {/* Image */}
                <div className="flex justify-center lg:justify-end">
                    <Image
                        src="/oster-app.png"
                        width={1080}
                        height={1920}
                        alt="Fotbollsapp på telefon"
                        className="object-contain"
                    />
                </div>
            </div>
        </section>
    );
}

export default function SpeladeMatcherBlock() {
    return (
        <div className="bg-custom_dark_dark_red flex flex-col gap-4 p-6 w-full py-2 relative">
            <h2 className="text-4xl font-bold mb-8 text-left text-white">
                Senast spelade matcher
            </h2>

            <Suspense fallback={<SpeladeMatcherSkeleton />}>
                <SpeladeMatcherServer maxMatches={8} />
            </Suspense>

            <AppPromoSection />
        </div>
    );
}
