import { CollectionArchive } from '@/app/components/CollectionArchive/index';
import PersonalItem from '@/app/components/Personal/PersonalItem';
import RichText from '@/app/components/RichText/index';
import { fetchAllPersonalAvdelningar } from '@/lib/apollo/fechPersonalAvdelningar/fetchAllPersonalAvdelningarAction';
import { fetchSinglePersonalAvdelningar } from '@/lib/apollo/fechPersonalAvdelningar/fetchSinglePersonalAvdelningarAction';
import { fetchAllPosts } from '@/lib/apollo/fetchNyheter/fetchAllPosts';
import { fetchPostsByCategory } from '@/lib/apollo/fetchNyheter/PostByCategoryQuery';
import { Post, ArchiveBlock as ArchiveBlockProps, Personal, Personalavdelningar, Foretagspaket, Foretagspaketkategorier } from '@/types';
import React from 'react';
import ForetagsPaketItem from '@/app/components/Partners/ForetagsPaketItem';
import { fetchAllForetagspaketKategorier } from '@/lib/apollo/fetchForetagspaketKategorier/fetchAllForetagspaketKategorierAction';
import { fetchForetagspaketByCategory } from '@/lib/apollo/fetchForetagpaket/fetchForetagsPaketByCategory';
import { fetchSingleForetagpaket } from '@/lib/apollo/fetchForetagpaket/fetchSingleForetagpaketAction';

// Helper function to generate grid column classes based on column count
const getGridColumnClasses = (columns: number): string => {
  const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  };

  return columnClasses[columns] || columnClasses[3];
};

export const ArchiveBlock: React.FC<ArchiveBlockProps & { id?: string; slug?: string }> = async (props) => {
  const {
    id,
    introContent,
    limit: limitFromProps,
    populateBy,
    relationTo,
    // Include fields
    postCategories,
    personalAvdelningar,
    foretagspaketkategorier,
    // Exclude fields
    excludePostCategories,
    excludePersonalAvdelningar,
    excludeForetagspaketkategorier,
    columns = 3,
    // Selection fields
    selectedPosts,
    selectedPersonal,
    selectedForetagspaket,
  } = props;

  const limit = limitFromProps || 3;

  let posts: Post[] = [];
  let personals: Personalavdelningar[] = [];
  let foretagspaketKategorier: Foretagspaketkategorier[] = [];

  if (populateBy === 'collection') {
    if (relationTo === 'posts') {
      const includeCategories = postCategories?.map((cat) => typeof cat === 'string' ? cat : cat.id) || [];
      const excludeCategories = excludePostCategories?.map((cat) => typeof cat === 'string' ? cat : cat.id) || [];

      if (includeCategories.length > 0) {
        // Fetch posts from specific categories
        posts = await fetchPostsByCategory(includeCategories, limit);
      } else {
        // Fetch all posts
        posts = await fetchAllPosts(limit);
      }

      // Apply exclude filter if specified
      if (excludeCategories.length > 0) {
        posts = posts.filter(post => {
          const postCategoryIds = post.categories?.map(cat =>
            typeof cat === 'string' ? cat : cat.id
          ) || [];

          // Keep posts that don't have any of the excluded categories
          return !excludeCategories.some(excludeId => postCategoryIds.includes(excludeId));
        });
      }
    }

    if (relationTo === 'personal') {
      const includeAvdelningar = personalAvdelningar?.map((avd) => typeof avd === 'string' ? avd : avd.slug).filter((slug): slug is string => typeof slug === 'string') || [];
      const excludeAvdelningar = excludePersonalAvdelningar?.map((avd) => typeof avd === 'string' ? avd : avd.slug).filter((slug): slug is string => typeof slug === 'string') || [];

      if (includeAvdelningar.length > 0) {
        // Fetch specific avdelningar
        const fetched = await Promise.all(
          includeAvdelningar.map((slug) => fetchSinglePersonalAvdelningar(slug))
        );
        personals = fetched.filter(Boolean);
      } else {
        // Fetch all avdelningar
        const fetchedPersonals = await fetchAllPersonalAvdelningar();
        if (fetchedPersonals?.length) personals = fetchedPersonals;
      }

      // Apply exclude filter if specified
      if (excludeAvdelningar.length > 0) {
        personals = personals.filter(avdelning =>
          !excludeAvdelningar.includes(avdelning.slug || '')
        );
      }
    }

    if (relationTo === 'foretagspaket') {
      const categoryInput = foretagspaketkategorier || postCategories;
      const excludeCategoryInput = excludeForetagspaketkategorier;

      const includeCategories = categoryInput?.map((cat) => typeof cat === 'string' ? cat : cat.id) || [];
      const excludeCategories = excludeCategoryInput?.map((cat) => typeof cat === 'string' ? cat : cat.id) || [];

      if (includeCategories.length > 0) {
        // Fetch packages from specific categories
        const fetched = await fetchForetagspaketByCategory(includeCategories, limit);

        // Group packages by category
        const groupedByCategory: Record<string, Foretagspaketkategorier> = {};

        for (const paket of fetched) {
          const category = paket.foretagspaketkategorier;

          if (!category) {
            continue;
          }

          // Skip if this category should be excluded
          if (excludeCategories.includes(category.id)) {
            continue;
          }

          if (!groupedByCategory[category.id]) {
            groupedByCategory[category.id] = {
              ...category,
              koppladepaket: { docs: [] },
            };
          }

          groupedByCategory[category.id]?.koppladepaket?.docs?.push(paket);
        }

        foretagspaketKategorier = Object.values(groupedByCategory);
      } else {
        // Fetch all categories, including their linked packages
        const allKategorier = await fetchAllForetagspaketKategorier();

        foretagspaketKategorier = allKategorier.filter(
          (k: Foretagspaketkategorier) => k.koppladepaket?.docs?.length
        );

        // Apply exclude filter if specified
        if (excludeCategories.length > 0) {
          foretagspaketKategorier = foretagspaketKategorier.filter(
            (kategori: Foretagspaketkategorier) =>
              !excludeCategories.includes(kategori.id)
          );
        }
      }
    }
  }

  else if (populateBy === 'selection') {
    // Selection mode remains unchanged
    if (relationTo === 'posts' && selectedPosts?.length) {
      const selected = selectedPosts.map((doc) => (typeof doc === 'object' && doc !== null && 'value' in doc ? doc.value : doc));
      posts = selected.filter((d): d is Post => d !== null && typeof d === 'object' && 'title' in d);
    }

    // Handle individual selection for personal
    else if (relationTo === 'personal' && selectedPersonal?.length) {
      // Since these are already full objects from the API, use them directly
      const selectedPersonalItems = selectedPersonal.filter(
        (item): item is Personal =>
          item !== null &&
          typeof item === 'object' &&
          'title' in item &&
          typeof (item as Personal).title === 'string'
      );

      if (selectedPersonalItems.length > 0) {
        personals = [{
          id: 'selected-personals',
          title: '', // Leave empty or add a title if needed
          koppladpersonal: {
            docs: selectedPersonalItems,
          },
        } as Personalavdelningar];
      }
    }

    // Handle individual selection for foretagspaket
    else if (relationTo === 'foretagspaket' && selectedForetagspaket?.length) {
      const selectedSlugs = selectedForetagspaket
        ?.map((doc) => {
          if (typeof doc === 'string') return doc;
          if (typeof doc === 'object' && doc !== null && 'slug' in doc && typeof doc.slug === 'string') {
            return doc.slug;
          }
          return null;
        })
        .filter((slug): slug is string => typeof slug === 'string') ?? [];

      const fetchedPakets = await Promise.all(
        selectedSlugs.map((slug) => fetchSingleForetagpaket(slug))
      );

      const validPakets = fetchedPakets.filter((p): p is Foretagspaket => !!p);

      if (validPakets.length > 0) {
        foretagspaketKategorier = [{
          id: 'selected-foretagspaket',
          title: '', // Optional: Set a custom title
          koppladepaket: {
            docs: validPakets,
          },
        } as Foretagspaketkategorier];
      }
    }
  }

  // 👇 Generate the grid classes based on the columns prop
  const gridClasses = getGridColumnClasses(Number(columns));

  // Determine if we should show avdelning titles
  const shouldShowAvdelningTitles = relationTo === 'personal' &&
    populateBy === 'collection' &&
    (!personalAvdelningar?.length || excludePersonalAvdelningar?.length);

  return (
    <div className="w-full" id={`block-${id}`}>
      {introContent && (
        <div>
          <RichText className="ml-0 mb-6 text-white" data={introContent} enableGutter={false} />
        </div>
      )}

      {relationTo === 'posts' && posts.length > 0 && (
        <CollectionArchive posts={posts.slice(0, limit)} />
      )}

      {relationTo === 'personal' && personals.length > 0 && (
        <ul className="space-y-16 w-full">
          {personals.map((avdelning) => (
            <li key={avdelning.id}>
              <div id={avdelning.slug ?? undefined}>
                {/* Avdelning Title - show when fetching all avdelningar or when excluding */}
                {shouldShowAvdelningTitles && avdelning.title && (
                  <h2 className="text-2xl font-semibold mb-4">{avdelning.title}</h2>
                )}

                {avdelning.koppladpersonal?.docs?.length ? (
                  <ul className={`w-full grid ${gridClasses} gap-x-6 gap-y-16`}>
                    {avdelning.koppladpersonal.docs
                      .filter((doc): doc is Personal => typeof doc !== 'string')
                      .map((person) => (
                        <PersonalItem key={person.id} person={person} />
                      ))}
                  </ul>
                ) : (
                  <p>No linked personnel for this avdelning.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {relationTo === 'foretagspaket' && foretagspaketKategorier.length > 0 && (
        <ul className="space-y-16 w-full">
          {foretagspaketKategorier.map((kategori) => (
            <li key={kategori.id}>
              {kategori.koppladepaket?.docs?.length ? (
                <ul className={`w-full grid ${gridClasses} gap-x-6 gap-y-16`}>
                  {kategori.koppladepaket.docs
                    .filter((doc): doc is Foretagspaket => typeof doc !== 'string')
                    .map((paket) => (
                      <ForetagsPaketItem key={paket.id} item={paket} />
                    ))}
                </ul>
              ) : (
                <p>No packages linked to this category.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};