'use client';

import dynamic from 'next/dynamic';
import { Post } from '@/types';

const SenasteNyheterClient = dynamic(() => import('./ComponentClient'), { ssr: false });

export default function SenasteNyheterClientWrapper({ posts }: { posts: Post[] }) {
  return <SenasteNyheterClient posts={posts} />;
}
