import { fetchAllCategoryPosts } from '@/lib/apollo/fetchNyheter/fetchAllCategoryAction';
import { fetchAllPosts } from '@/lib/apollo/fetchNyheter/fetchAllPosts';
import NewsPageClient from './NyheterClient';

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

export default async function NewsPage() {
  const [posts, categories] = await Promise.all([
    fetchAllPosts(10),
    fetchAllCategoryPosts(),
  ]);

  return <NewsPageClient posts={posts} categories={categories} />;
}