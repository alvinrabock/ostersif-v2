import { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { BlockRenderer } from '@/app/components/BlockRenderer';

import { fetchPageData } from '@/lib/apollo/fetchSinglePage/action';
import { RenderHero } from '@/app/components/Heros/RenderHero';
import { PayloadRedirects } from '@/app/components/PayloadRedirects/index';
import { LivePreviewListener } from '@/app/components/LivePreviewListener/index';


type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  // Wait for params to resolve since it's a Promise
  const resolvedParams = await params;

  const { isEnabled: draft } = await draftMode();
  const slug = resolvedParams.slug || 'home';
const page = await fetchPageData(slug, draft);

  if (!page) {
    return <PayloadRedirects url={`/${slug}`} />;
  }

  const { hero, layout } = page;

  return (
    <article className='min-h-screen pb-20'>
      <PayloadRedirects disableNotFound url={`/${slug}`} />
      {draft && <LivePreviewListener />}
      <RenderHero {...hero} />
      <BlockRenderer blocks={layout} />
    </article>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;

  const slug = resolvedParams.slug || 'home';
  const page = await fetchPageData(slug);

  return {
    title: page?.meta?.title || 'Östers IF',
    description: page?.meta?.description || 'Vi är Östers IF',
    openGraph: {
      title: page?.meta?.title || 'Östers IF',
      description: page?.meta?.description || 'Vi är Östers IF',
    },
  };
}
