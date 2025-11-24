import React from 'react';
import { Jobb } from '@/types';
import Link from 'next/link';
import { Metadata } from 'next';
import { fetchAllJobbs } from '@/lib/apollo/fetchJobb/fetchAllJobbAction';
import { Media } from '../components/Media/index';
import MaxWidthWrapper from '../components/MaxWidthWrapper';

// SEO Metadata for the page
export const metadata: Metadata = {
    title: 'Lediga Jobb - Hitta Din Nästa Karriärmöjlighet',
    description: 'Utforska våra lediga tjänster och hitta din nästa karriärmöjlighet. Vi erbjuder spännande jobbmöjligheter inom olika branscher.',
    keywords: 'lediga jobb, karriär, anställning, rekrytering, arbete, tjänster',
    openGraph: {
        title: 'Lediga Jobb - Hitta Din Nästa Karriärmöjlighet',
        description: 'Utforska våra lediga tjänster och hitta din nästa karriärmöjlighet. Vi erbjuder spännande jobbmöjligheter inom olika branscher.',
        type: 'website',
        locale: 'sv_SE',
        siteName: 'Vårt Företag',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Lediga Jobb - Hitta Din Nästa Karriärmöjlighet',
        description: 'Utforska våra lediga tjänster och hitta din nästa karriärmöjlighet.',
    },
    alternates: {
        canonical: '/jobb',
        languages: {
            'sv-SE': '/jobb',
        },
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

// This is a Server Component (Next.js 13+)
const JobsPage = async () => {
    let jobs: Jobb[] = [];
    let error: string | null = null;

    try {
        jobs = await fetchAllJobbs(10, 1);
    } catch (err) {
        console.error('Failed to fetch jobs:', err);
        error = 'Failed to load jobs. Please try again later.';
    }

    if (error) {
        return (
            <div className="w-full pt-40 pb-20">
                <MaxWidthWrapper>
                <h1 className="text-3xl font-bold mb-6 text-white">Lediga Jobb</h1>
                <div className="bg-red-500/20 border border-red-300/30 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-red-100">{error}</p>
                </div>
                </MaxWidthWrapper>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="w-full pt-40 pb-20">
                <MaxWidthWrapper>
                    <h1 className="text-3xl font-bold mb-6 text-white">Lediga Jobb</h1>
                    <div className="bg-white/10 border border-white/20 rounded-lg p-8 text-center backdrop-blur-sm">
                        <p className="text-white/70">Inga jobb tillgängliga för tillfället.</p>
                    </div>
                </MaxWidthWrapper>
            </div>
        );
    }

    return (
        <div className='w-full pt-40 pb-20'>
            <MaxWidthWrapper>
                <h1 className="text-3xl font-bold mb-6 text-white">Lediga Jobb</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                        <Link
                            key={job.id}
                            href={`/jobb/${job.slug}`}
                            className="group block"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-lg shadow-sm  overflow-hidden backdrop-blur-sm cursor-pointer">
                                {/* Job Photo */}
                                {job.photo && (
                                    <div className="relative h-48 w-full overflow-hidden">
                                        <Media
                                            resource={job.photo}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                                    </div>
                                )}

                                <div className="p-6">
                                    {/* Job Title */}
                                    <h2 className="text-xl font-semibold mb-2 text-white">
                                        {job.title}
                                    </h2>

                                    {/* Meta Description */}
                                    {job.meta?.description && (
                                        <p className="text-white/70 mb-4 line-clamp-3 group-hover:text-white/80 transition-colors duration-300">
                                            {job.meta.description}
                                        </p>
                                    )}

                                    {/* Job Details */}
                                    <div className="space-y-2 mb-4">
                                        {job.enddate && (
                                            <div className="flex items-center text-sm text-white/60">
                                                <span className="font-medium">Slutdatum:</span>
                                                <span className="ml-2">
                                                    {new Date(job.enddate).toLocaleDateString('sv-SE')}
                                                </span>
                                            </div>
                                        )}

                                        {job.publishedAt && (
                                            <div className="flex items-center text-sm text-white/60">
                                                <span className="font-medium">Publicerad:</span>
                                                <span className="ml-2">
                                                    {new Date(job.publishedAt).toLocaleDateString('sv-SE')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Read More Indicator */}
                                    <div className="inline-flex items-center text-blue-300 group-hover:text-blue-200 transition-colors duration-300">
                                        <span className="text-sm font-medium">Läs mer</span>
                                        <svg
                                            className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </MaxWidthWrapper>
        </div>
    );
};

export default JobsPage;