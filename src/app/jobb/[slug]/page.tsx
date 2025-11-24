import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Jobb } from '@/types';
import { fetchJobbBySlug } from '@/lib/apollo/fetchJobb/fetchSingleJobbAction';
import { Media } from '../../components/Media/index';
import MaxWidthWrapper from '../../components/MaxWidthWrapper';
import RichText from '@/app/components/RichText/index';

type PageProps = {
    params: Promise<{ slug: string }>;
  };

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps) {
    try {
        const resolvedParams = await params;
        const { slug } = resolvedParams;
        const job = await fetchJobbBySlug(slug);

        if (!job) {
            return {
                title: 'Jobb inte hittat',
                description: 'Det begärda jobbet kunde inte hittas.',
            };
        }

        const title = `${job.title} - Lediga Jobb`;
        const description = job.meta?.description || `Ansök för ${job.title}. Läs mer om denna spännande karriärmöjlighet och vad vi erbjuder.`;
        const imageUrl = job.photo && typeof job.photo === 'object' && 'url' in job.photo
            ? job.photo.url
            : null;

        return {
            title,
            description,
            keywords: `${job.title}, lediga jobb, karriär, anställning, arbete`,
            openGraph: {
                title,
                description,
                type: 'article',
                locale: 'sv_SE',
                siteName: 'Vårt Företag',
                publishedTime: job.publishedAt,
                modifiedTime: job.updatedAt,
                ...(imageUrl && {
                    images: [
                        {
                            url: imageUrl,
                            width: 1200,
                            height: 630,
                            alt: job.title,
                        },
                    ],
                }),
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                ...(imageUrl && {
                    images: [imageUrl],
                }),
            },
            alternates: {
                canonical: `/jobb/${resolvedParams.slug}`,
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
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Jobb inte hittat',
            description: 'Det begärda jobbet kunde inte hittas.',
        };
    }
}

// Main component
const JobPage = async ({ params }: PageProps) => {
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    let job: Jobb | null = null;
    let error: string | null = null;

    try {
        job = await fetchJobbBySlug(slug);
    } catch (err) {
        console.error('Failed to fetch job:', err);
        error = 'Kunde inte ladda jobbinformation. Försök igen senare.';
    }

    if (error || !job) {
        notFound();
    }

    // TypeScript assertion - we know job is not null after the notFound() check
    const jobData = job as Jobb;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="w-full pt-40 pb-20 min-h-screen">
            <MaxWidthWrapper>
                {/* Breadcrumb Navigation */}
                <nav className="mb-8" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2 text-sm">
                        <li>
                            <Link
                                href="/jobb"
                                className="text-white/70 hover:text-white transition-colors duration-200"
                            >
                                Lediga Jobb
                            </Link>
                        </li>
                        <li className="text-white/50">/</li>
                        <li className="text-white font-medium truncate">{jobData.title}</li>
                    </ol>
                </nav>

                <div>
                    {/* Job Header */}
                    <header className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-4">
                            {jobData.title}
                        </h1>

                        {jobData.publishedAt && (
                            <p className="text-white/60 mb-4">
                                Publicerad: {formatDate(jobData.publishedAt)}
                            </p>
                        )}

                        {jobData.meta?.description && (
                            <p className="text-xl text-white/80 leading-relaxed">
                                {jobData.meta.description}
                            </p>
                        )}
                    </header>

                    {/* Job Image */}
                    {jobData.photo && (
                        <div className="relative h-64 md:h-80 w-full mb-8 rounded-lg overflow-hidden">
                            <Media
                                resource={jobData.photo}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                    )}

                    {/* Job Content */}
                    {jobData.content && (
                        <div className="prose prose-invert prose-lg max-w-none mb-8">
                            <div className="text-white/90 leading-relaxed">
                                <RichText data={jobData.content} enableGutter={false} />
                            </div>
                        </div>
                    )}

                    {/* Back to Jobs */}
                    <div className="pt-8 border-t border-white/10">
                        <Link
                            href="/jobb"
                            className="inline-flex items-center text-white/70 hover:text-white transition-colors duration-200"
                        >
                            <svg
                                className="mr-2 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Tillbaka till alla jobb
                        </Link>
                    </div>
                </div>


            </MaxWidthWrapper>
        </div>
    );
};

export default JobPage;