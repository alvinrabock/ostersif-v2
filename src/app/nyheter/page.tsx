import { Suspense } from 'react';
import { fetchAllNyhetskategorier } from '@/lib/frontspace/adapters/nyhetskategorier';
import { fetchAllNyheter } from '@/lib/frontspace/adapters/nyheter';
import NewsPageClient from './NyheterClient';
import MaxWidthWrapper from '@/app/components/MaxWidthWrapper';

// On-demand revalidation only via webhook - no time-based polling

export const metadata = {
  title: 'Nyheter - Östers IF',
  description: 'Håll dig uppdaterad med de senaste nyheterna från Östers IF. Läs om matcher, spelare, träningar och allt som händer i klubben.',
  keywords: 'Östers IF, nyheter, fotboll, Växjö, Superettan, matcher, spelare, träning, klubbnyheter',
  openGraph: {
    title: 'Nyheter - Östers IF',
    description: 'Håll dig uppdaterad med de senaste nyheterna från Östers IF. Läs om matcher, spelare, träningar och allt som händer i klubben.',
    type: 'website',
    url: '/nyheter',
    siteName: 'Östers IF',
    locale: 'sv_SE',
  },
  category: 'sport',
};

// Skeleton for loading state
function NewsPageSkeleton() {
  return (
    <div className="w-full py-40 bg-custom_dark_dark_red">
      <MaxWidthWrapper>
        <div className="w-full mb-4">
          <div className="flex flex-col justify-center items-start text-left w-full text-white border-b border-white/40 pb-6">
            <div className="h-12 w-64 bg-white/10 rounded animate-pulse mb-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-10 text-white">
          <div className="hidden xl:block col-span-2 p-4 border border-white rounded-lg">
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-white/10 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="col-span-5">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="relative w-full aspect-video mb-4 bg-white/10 rounded-md" />
                  <div className="h-4 bg-white/10 rounded w-24 mb-2" />
                  <div className="h-6 bg-white/10 rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}

// Server component that fetches data
async function NewsContent() {
  const [posts, categories] = await Promise.all([
    fetchAllNyheter(10, 1),
    fetchAllNyhetskategorier(100),
  ]);

  return <NewsPageClient posts={posts} categories={categories} />;
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsPageSkeleton />}>
      <NewsContent />
    </Suspense>
  );
}
