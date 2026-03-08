/**
 * Debug: Inspect consolidatedCSS from pageBundle
 * Tells us if the backend handles container backgrounds (::before/::after)
 * Usage: GET /api/debug/css-check?slug=home
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPageBundle } from '@/lib/frontspace/client';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || 'home';

  const bundle = await fetchPageBundle(slug);
  const css = bundle?.consolidatedCSS ?? null;

  if (!css) {
    return NextResponse.json({ error: 'No consolidatedCSS returned for this slug' }, { status: 404 });
  }

  // Count selector types
  const dataAttrMatches = css.match(/\[data-block-id/g)?.length ?? 0;
  const idMatches = css.match(/#block-/g)?.length ?? 0;
  const classMatches = css.match(/\.block-/g)?.length ?? 0;

  // Check for background-related CSS
  const hasBefore = css.includes('::before');
  const hasAfter = css.includes('::after');
  const hasPositionRelative = css.includes('position: relative') || css.includes('position:relative');
  const hasZIndex = css.includes('z-index');
  const hasBackgroundImage = css.includes('background-image');

  // Pull out up to 3 example container rules (blocks that have ::before)
  const beforeRules: string[] = [];
  const beforeRegex = /[^\}]+::before\s*\{[^\}]+\}/g;
  let match;
  while ((match = beforeRegex.exec(css)) !== null && beforeRules.length < 3) {
    beforeRules.push(match[0].trim());
  }

  // Get first 800 chars to see selector format
  const preview = css.slice(0, 800);

  return NextResponse.json(
    {
      slug,
      cssBytes: css.length,
      selectors: {
        '[data-block-id]': dataAttrMatches,
        '#block-': idMatches,
        '.block-': classMatches,
      },
      backgroundCSS: {
        hasBefore,
        hasAfter,
        hasPositionRelative,
        hasZIndex,
        hasBackgroundImage,
        verdict: hasBefore
          ? '✅ Backend generates ::before — consolidatedCSS handles container backgrounds'
          : '❌ No ::before found — frontend must keep generateBackgroundCSS',
      },
      beforeExamples: beforeRules,
      preview,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
