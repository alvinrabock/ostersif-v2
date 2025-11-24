// components/hero/SwiperHero.tsx
import { fetchFeaturedPosts } from '@/lib/apollo/fetchNyheter/fetchSliderNyheter'
import React from 'react'
import SwiperHeroClient from './SwiperHeroClient'

export const SwiperHero = async () => {
  const posts = await fetchFeaturedPosts()

  return <SwiperHeroClient posts={posts} />
}

