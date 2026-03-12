import { NextRequest, NextResponse } from 'next/server';
import { frontspace } from '@/lib/frontspace/client';

/**
 * Debug endpoint to inspect raw content from Frontspace for a nyhet post.
 * GET /api/debug/nyhet-content?slug=har-ar-arets-hemmastall
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Provide ?slug=xxx' }, { status: 400 });
  }

  try {
    const nyhet = await frontspace.nyheter.getBySlug(slug) as any;
    if (!nyhet) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const content = nyhet.content || {};
    const richText = content.content;

    // Check for Tiptap JSON in multiple possible fields
    const tiptapSources = {
      'content.content': richText,
      'content.tiptapContent': content.tiptapContent,
      'content.contentJson': content.contentJson,
      'content.body': content.body,
      'content.richText': content.richText,
    };

    const tiptapCheck: Record<string, any> = {};
    for (const [key, val] of Object.entries(tiptapSources)) {
      if (val === undefined) continue;
      const type = typeof val;
      let isTiptap = false;
      if (type === 'object' && val !== null && val.type === 'doc') isTiptap = true;
      if (type === 'string') {
        try {
          const parsed = JSON.parse(val);
          isTiptap = parsed?.type === 'doc';
        } catch { /* not JSON */ }
      }
      tiptapCheck[key] = { type, isTiptap, preview: type === 'string' ? val.slice(0, 200) : JSON.stringify(val)?.slice(0, 200) };
    }

    return NextResponse.json({
      slug: nyhet.slug,
      title: nyhet.title,
      contentFieldType: typeof richText,
      isObject: typeof richText === 'object' && richText !== null,
      isTiptapDoc: typeof richText === 'object' && richText?.type === 'doc',
      isHTML: typeof richText === 'string' && richText.startsWith('<'),
      isTiptapString: typeof richText === 'string' && richText.includes('"type":"doc"'),
      contentKeys: typeof content === 'object' ? Object.keys(content) : [],
      tiptapCheck,
      // Show first 2000 chars of the rich text field
      richTextPreview: typeof richText === 'string'
        ? richText.slice(0, 2000)
        : JSON.stringify(richText, null, 2)?.slice(0, 2000),
      // Show all content field keys and their types
      allFields: Object.entries(content).map(([key, val]) => ({
        key,
        type: typeof val,
        isArray: Array.isArray(val),
        preview: typeof val === 'string' ? val.slice(0, 200) : typeof val === 'object' ? JSON.stringify(val)?.slice(0, 200) : String(val),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
