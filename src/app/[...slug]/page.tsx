import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/app/components/BlockRenderer';
import { fetchAllPagesCached, fetchAllPages } from '@/lib/frontspace/client';
import { buildPagePaths, findPageByPath } from '@/utils/pageRouting';

// On-demand revalidation only via webhook - no time-based polling

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;

  // Construct full path from URL segments
  const fullPath = '/' + resolvedParams.slug.join('/');

  // Try cached data first, fall back to fresh fetch if cache returns empty
  // This handles the race condition during cache revalidation
  let pages = await fetchAllPagesCached();

  // If cache returned empty (during revalidation), fetch fresh data
  if (!pages || pages.length === 0) {
    pages = await fetchAllPages();
  }

  const pagesWithPaths = buildPagePaths(pages);

  // Find matching page
  const page = findPageByPath(pagesWithPaths, fullPath);

  if (!page) {
    notFound();
  }

  // Extract blocks from page content
  const blocks = page.content?.blocks || [];

  return (
    <article className="min-h-screen pb-20">
      <BlockRenderer blocks={blocks} />
    </article>
  );
}

// Generate static paths at build time
export async function generateStaticParams() {
  const pages = await fetchAllPages();
  const pagesWithPaths = buildPagePaths(pages);

  // Filter out single-level pages (handled by [slug]/page.tsx)
  // Only include nested pages with at least 2 segments
  return pagesWithPaths
    .filter(page => {
      const segments = page.fullPath.split('/').filter(Boolean);
      return segments.length >= 2;
    })
    .map(page => ({
      slug: page.fullPath.split('/').filter(Boolean)
    }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;

  // Construct full path from URL segments
  const fullPath = '/' + resolvedParams.slug.join('/');

  // Try cached data first, fall back to fresh fetch if cache returns empty
  let pages = await fetchAllPagesCached();
  if (!pages || pages.length === 0) {
    pages = await fetchAllPages();
  }
  const pagesWithPaths = buildPagePaths(pages);

  // Find matching page
  const page = findPageByPath(pagesWithPaths, fullPath);

  if (!page) {
    return {
      title: 'Sidan hittades inte - Östers IF',
      description: 'Vi är Östers IF',
    };
  }

  const seoTitle = page.content?.pageSettings?.seoTitle || page.title;
  const seoDescription = page.content?.pageSettings?.seoDescription || '';

  return {
    title: seoTitle + ' - Östers IF',
    description: seoDescription || 'Vi är Östers IF',
    openGraph: {
      title: seoTitle,
      description: seoDescription || 'Vi är Östers IF',
      url: fullPath,
    },
  };
}
