import MaxWidthWrapper from "@/app/components/MaxWidthWrapper";
import { Media } from "@/app/components/Media/index";
import MiniNyhetertItem from "@/app/components/Nyheter/miniNyheterItem";
import RichText from "@/app/components/RichText/index";
import { fetchRelatedPosts } from "@/lib/apollo/fetchNyheter/fetchRelatedNyheter";
import { fetchSinglePosts } from "@/lib/apollo/fetchNyheter/fetchSinglePostsAction";
import { Category, Media as MediaType } from "@/types";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ categorySlug: string[]; slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch the post data for metadata
  const post = await fetchSinglePosts(slug);

  if (!post) {
    return {
      title: 'Artikel inte hittad - Östers IF',
      description: 'Den begärda artikeln kunde inte hittas.',
    };
  }

  // Use custom meta fields if available, otherwise fallback to post data
  const title = post.meta?.title || post.title;
  const description = post.meta?.description || 
    `Läs mer om ${post.title} från Östers IF. Publicerad ${new Date(post.publishedAt || '').toLocaleDateString('sv-SE')}.`;
  
  // Get the meta image with multiple fallbacks: meta.image -> heroImage -> thumbnail
  const getMetaImage = () => {
    // First try meta image
    if (post.meta?.image) return post.meta.image;
    
    // Then try hero image
    if (post.heroImage) return post.heroImage;
    
    return null;
  };
  
  const metaImage = getMetaImage();
  
  // Handle Payload CMS image format (can be string ID or MediaType object)
  const getImageUrl = (image: string | MediaType | null | undefined) => {
    if (!image) return null;
    if (typeof image === 'string') return null; // Just an ID, can't get URL
    
    // Priority: large -> medium -> small -> thumbnail -> original
    return image.sizes?.large?.url || 
           image.sizes?.medium?.url || 
           image.sizes?.small?.url || 
           image.sizes?.thumbnail?.url || 
           image.url;
  };
  
  const getImageDimensions = (image: string | MediaType | null | undefined) => {
    if (!image || typeof image === 'string') return { width: 1200, height: 630 };
    
    // Get dimensions from the best available size
    const largeSize = image.sizes?.large;
    const mediumSize = image.sizes?.medium;
    const originalSize = { width: image.width, height: image.height };
    
    if (largeSize?.width && largeSize?.height) {
      return { width: largeSize.width, height: largeSize.height };
    }
    if (mediumSize?.width && mediumSize?.height) {
      return { width: mediumSize.width, height: mediumSize.height };
    }
    if (originalSize.width && originalSize.height) {
      return originalSize;
    }
    
    return { width: 1200, height: 630 }; // Default OG dimensions
  };
  
  const imageUrl = getImageUrl(metaImage);
  const imageDimensions = getImageDimensions(metaImage);
  
  // Generate category-based keywords
  const categoryKeywords = post.categories
    ?.map(cat => typeof cat !== 'string' ? cat.title : cat)
    .join(', ') || '';

  return {
    title: `${title} - Östers IF`,
    description,
    keywords: `Östers IF, ${categoryKeywords}, fotboll, Växjö, Superettan, nyheter`,
    openGraph: {
      title: `${title} - Östers IF`,
      description,
      type: 'article',
      url: `/nyheter/${slug}`,
      siteName: 'Östers IF',
      locale: 'sv_SE',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: ['Östers IF'],
      section: 'Sport',
      tags: post.categories?.map(cat => 
        typeof cat !== 'string' ? cat.title : cat
      ) || [],
      images: imageUrl ? [{
        url: imageUrl,
        width: imageDimensions.width,
        height: imageDimensions.height,
        alt: (typeof metaImage !== 'string' ? metaImage?.alt : null) || title,
      }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Östers IF`,
      description,
      site: '@ostersif', 
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: `/nyheter/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      'article:author': 'Östers IF',
      'article:section': 'Sport',
      'article:published_time': post.publishedAt,
      'article:modified_time': post.updatedAt || post.publishedAt,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch the single post data
  const post = await fetchSinglePosts(slug);

  // Handle the null case early
  if (!post) return notFound();

  // Now TypeScript knows post is not null
  // Safely access categories and handle null/undefined values
  const categoryIds = post.categories?.map((cat) => (typeof cat === "string" ? cat : cat.id)) ?? [];
  const parentCategoryIds = post.categories
    ?.map((cat) => (typeof cat === "string" ? null : cat.parent))
    .filter(Boolean) ?? [];

  // Merge category and parent category IDs into one array
  const relatedCategoryIds = Array.from(
    new Set([
      ...categoryIds,
      ...parentCategoryIds.filter((id): id is string => id !== null && id !== undefined)
    ])
  );

  // Fetch related posts (excluding the current one)
  const relatedPosts = await fetchRelatedPosts(relatedCategoryIds, post.id);

  // Extract YouTube video ID
  const youtubeLink = post?.youtubeLink || '';
  const youtubeVideoId = youtubeLink ? youtubeLink.split("v=")[1]?.split("&")[0] : null;

  // Helper function to check if an item is a Category
  const isCategory = (category: string | Category): category is Category => {
    return (category as Category).title !== undefined;
  };

  // Generate breadcrumbs (optional, for navigation purposes)
  const breadcrumbs = [
    <li key="nyheter" className="inline-block text-sm text-gray-500">
      <Link href="/nyheter" className="hover:underline">Nyheter</Link>
      <span className="mx-2">/</span>
    </li>,
    ...(post.categories && Array.isArray(post.categories) && post.categories.length
      ? post.categories.map((category, index) => (
        <li key={isCategory(category) ? category.id : category} className="inline-block text-sm text-gray-500">
          {isCategory(category) ? (
            <Link href={`/nyheter/${category.slug}`} className="hover:underline">
              {category.title}
            </Link>
          ) : (
            <span>{category}</span> // Handle the case when it's just a string
          )}
          {index < (post.categories?.length ?? 0) - 1 && <span className="mx-2">/</span>}
        </li>
      ))
      : [])
  ];

  return (
    <div className="w-full py-36 bg-custom_dark_dark_red text-white">
      <MaxWidthWrapper>
        <nav className="mb-4">
          <ol className="list-none p-0">
            {breadcrumbs}
          </ol>
        </nav>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="relative pb-[56.25%] w-full mb-6">
              {youtubeVideoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube video"
                  frameBorder="0"
                  loading="lazy"
                  rel="0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                />
              ) : (
                <Media
                  resource={post.heroImage ?? ""}
                  fill
                  imgClassName="w-full h-full object-cover rounded-lg"
                  size="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 800px"
                />
              )}
            </div>

            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

            <p className="text-sm text-gray-500 mb-4">
              {new Date(post.publishedAt || '').toLocaleDateString()}
            </p>

            <div>
              <RichText className="w-full mx-auto" data={post.content} enableGutter={false} />
            </div>
          </div>

          {/* Related posts */}
          <div className="xl:sticky xl:top-36 h-fit">
            <h2 className="text-xl font-semibold mb-4 mt-10 xl:mt-0">Relaterat</h2>
            <ul className="space-y-4">
              {relatedPosts.map((related) => (
                <MiniNyhetertItem key={related.id} post={related} />
              ))}
            </ul>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}