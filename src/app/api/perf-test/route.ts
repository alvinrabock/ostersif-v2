/**
 * Performance comparison: pageBundle (new) vs fetchAllPages (old)
 * Usage: GET /api/perf-test?slug=home
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPageBundle, fetchAllPages } from '@/lib/frontspace/client';
import { buildPagePaths, findPageByPath } from '@/utils/pageRouting';
import { generateBlockCSS } from '@/lib/block-utils';

function measureCSSGeneration(blocks: any[]): { timeMs: number; blockCount: number } {
  const start = performance.now();
  let blockCount = 0;

  function process(blocks: any[]) {
    for (const block of blocks) {
      generateBlockCSS(block.id, block.styles, block.responsiveStyles, block.visibility);
      blockCount++;
      if (block.content?.children?.length) {
        process(block.content.children);
      }
    }
  }

  process(blocks);
  return { timeMs: performance.now() - start, blockCount };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || 'home';
  const fullPath = '/' + slug;

  // ─── NEW PATH: pageBundle ────────────────────────────────────────────────
  const t1 = performance.now();
  const bundle = await fetchPageBundle(slug);
  const bundleFetchMs = performance.now() - t1;

  const newPath = {
    fetchMs: Math.round(bundleFetchMs),
    cssBytes: bundle?.consolidatedCSS?.length ?? 0,
    topLevelBlocks: bundle?.page?.content?.blocks?.length ?? 0,
    cssGenMs: 0, // pre-computed by backend
    totalMs: Math.round(bundleFetchMs),
    success: !!bundle?.consolidatedCSS,
  };

  // ─── OLD PATH: fetchAllPages + generateBlockCSS ──────────────────────────
  const t2 = performance.now();
  const pages = await fetchAllPages();
  const fetchAllPagesMs = performance.now() - t2;

  const pagesWithPaths = buildPagePaths(pages);
  const page = findPageByPath(pagesWithPaths, fullPath);
  const blocks = page?.content?.blocks || [];
  const css = measureCSSGeneration(blocks);

  const oldPath = {
    fetchMs: Math.round(fetchAllPagesMs),
    totalPagesLoaded: pages.length,
    blockCount: css.blockCount,
    cssGenMs: Math.round(css.timeMs),
    totalMs: Math.round(fetchAllPagesMs + css.timeMs),
  };

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  const savedMs = oldPath.totalMs - newPath.totalMs;

  console.log('\n══════════════════════════════════════════')
  console.log(`  PERF TEST — slug: "${slug}"`)
  console.log('══════════════════════════════════════════')
  console.log(`  NEW  pageBundle fetch:    ${newPath.fetchMs}ms`)
  console.log(`  NEW  CSS generation:      0ms  (backend pre-computed)`)
  console.log(`  NEW  TOTAL:               ${newPath.totalMs}ms`)
  console.log('  ──────────────────────────────────────')
  console.log(`  OLD  fetchAllPages:       ${oldPath.fetchMs}ms  (${oldPath.totalPagesLoaded} pages loaded)`)
  console.log(`  OLD  CSS generation:      ${oldPath.cssGenMs}ms  (${oldPath.blockCount} blocks)`)
  console.log(`  OLD  TOTAL:               ${oldPath.totalMs}ms`)
  console.log('  ──────────────────────────────────────')
  console.log(`  SAVED: ${savedMs}ms  (${savedMs > 0 ? '🚀 new is faster' : '⚠️  old is faster — check network'})`)
  console.log('══════════════════════════════════════════\n')

  return NextResponse.json(
    {
      slug,
      newPath,
      oldPath,
      saved: {
        ms: savedMs,
        note: savedMs > 0 ? 'new path is faster' : 'old path was faster this run (cache may be warm)',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
