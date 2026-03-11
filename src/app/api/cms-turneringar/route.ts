import { NextResponse } from 'next/server'
import { fetchPosts } from '@/lib/frontspace/client'

export async function GET() {
  try {
    const { posts } = await fetchPosts<any>('turneringar', { limit: 500 })

    const parsed = (posts || []).map((post: any) => {
      const content = typeof post.content === 'string' ? JSON.parse(post.content) : post.content || {}
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content,
      }
    })

    return NextResponse.json({ success: true, count: parsed.length, posts: parsed })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
