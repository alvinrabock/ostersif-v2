import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/app/components/BlockRenderer';
import { fetchAllPagesCached, fetchAllPages, fetchPageBundleCached, fetchPageSlugs } from '@/lib/frontspace/client';
import { buildPagePaths, findPageByPath } from '@/utils/pageRouting';
// On-demand revalidation only via webhook - no time-based polling

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || 'home';

  // Construct full path (single-level page)
  const fullPath = '/' + slug;

  // Try pageBundle first (optimized path: pre-computed CSS, single fetch)
  const bundle = await fetchPageBundleCached(slug);
  const consolidatedCSS: string | null = bundle?.consolidatedCSS ?? null;
  let blocks = bundle?.page?.content?.blocks ?? null;

  // Fall back to classic path if pageBundle not available (e.g. page not yet re-published)
  if (!blocks) {
    let pages = await fetchAllPagesCached();
    if (!pages || pages.length === 0) {
      pages = await fetchAllPages();
    }
    const page = findPageByPath(buildPagePaths(pages), fullPath);
    if (!page) {
      notFound();
    }
    blocks = page.content?.blocks || [];
  }

  return (
    <article className="min-h-screen pb-20">
      {consolidatedCSS && (
        // React 19 hoists <style precedence> to <head> automatically
        <style precedence="default" dangerouslySetInnerHTML={{ __html: consolidatedCSS }} />
      )}
      <BlockRenderer blocks={blocks} skipStyleInjection={!!consolidatedCSS} />
    </article>
  );
}

// Generate static paths at build time — lightweight query, slugs only
export async function generateStaticParams() {
  const slugs = await fetchPageSlugs();
  const pagesWithPaths = buildPagePaths(slugs);

  // Only include single-level pages (no parent)
  return pagesWithPaths
    .filter(page => {
      const segments = page.fullPath.split('/').filter(Boolean);
      return segments.length === 1;
    })
    .map(page => ({
      slug: page.slug
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || 'home';
  const fullPath = '/' + slug;

  // Try pageBundle first — already has pageSettings, no extra fetch needed
  const bundle = await fetchPageBundleCached(slug);
  const pageSettings = bundle?.page?.content?.pageSettings;
  const pageTitle = bundle?.page?.title;

  // Fall back to fetchAllPages if no bundle
  if (!bundle?.page) {
    let pages = await fetchAllPagesCached();
    if (!pages || pages.length === 0) pages = await fetchAllPages();
    const page = findPageByPath(buildPagePaths(pages), fullPath);
    if (!page) {
      return { title: 'Sidan hittades inte', description: 'Vi är Östers IF' };
    }
    const seoTitle = page.content?.pageSettings?.seoTitle || page.title;
    const seoDescription = page.content?.pageSettings?.seoDescription || '';
    const canonicalPath = slug === 'home' ? '/' : fullPath;
    return {
      title: seoTitle,
      description: seoDescription || 'Vi är Östers IF',
      openGraph: { title: `${seoTitle} - Östers IF`, description: seoDescription || 'Vi är Östers IF', url: canonicalPath },
      alternates: { canonical: canonicalPath },
    };
  }

  const seoTitle = pageSettings?.seoTitle || pageTitle || slug;
  const seoDescription = pageSettings?.seoDescription || '';
  const canonicalPath = slug === 'home' ? '/' : fullPath;

  return {
    title: seoTitle,
    description: seoDescription || 'Vi är Östers IF',
    openGraph: { title: `${seoTitle} - Östers IF`, description: seoDescription || 'Vi är Östers IF', url: canonicalPath },
    alternates: { canonical: canonicalPath },
  };
}
