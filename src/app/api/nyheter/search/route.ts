import { NextRequest, NextResponse } from 'next/server';
import { searchNyheter } from '@/lib/frontspace/adapters/nyheter';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (!query || query.length < 3) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const posts = await searchNyheter(query, limit);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', posts: [] },
      { status: 500 }
    );
  }
}
