"use server";

/**
 * Test endpoint to create sample matches in CMS
 * DELETE THIS FILE after testing
 */

import { NextRequest, NextResponse } from 'next/server';

const FRONTSPACE_ENDPOINT = process.env.FRONTSPACE_ENDPOINT || 'http://localhost:3000/api/graphql';
const FRONTSPACE_STORE_ID = process.env.FRONTSPACE_STORE_ID || '';
const FRONTSPACE_API_KEY = process.env.FRONTSPACE_API_KEY;

// The matcher post type ID in Frontspace
const MATCHER_POST_TYPE_ID = '5e8b21d9-5c7a-4919-8dc2-0ccde6108964';

const TEST_MATCHES = [
  {
    title: "Östers IF vs IFK Göteborg",
    slug: "2025-03-15-osters-if-vs-ifk-goteborg",
    content: {
      hemmalag: "Östers IF",
      bortalag: "IFK Göteborg",
      datum: "2025-03-15",
      tid_for_avspark: "15:00",
      arena: "Myresjöhus Arena",
      matchstatus: "Scheduled",  // Select field: Scheduled, in-progress, Over
      mal_hemmalag: 0,
      mal_bortalag: 0,
      leaguename: "Superettan",
      sasong: "2025",
      externalmatchid: "test-001",
      externalleagueid: "100182",
      iscustomgame: "false",  // Select field, not boolean
      lastsyncedat: new Date().toISOString(),
    }
  },
  {
    title: "Degerfors IF vs Östers IF",
    slug: "2025-03-22-degerfors-if-vs-osters-if",
    content: {
      hemmalag: "Degerfors IF",
      bortalag: "Östers IF",
      datum: "2025-03-22",
      tid_for_avspark: "17:30",
      arena: "Stora Valla",
      matchstatus: "Over",  // Select field
      mal_hemmalag: 1,
      mal_bortalag: 3,
      leaguename: "Superettan",
      sasong: "2025",
      externalmatchid: "test-002",
      externalleagueid: "100182",
      iscustomgame: "false",  // Select field, not boolean
      lastsyncedat: new Date().toISOString(),
    }
  }
];

async function createTestMatch(match: typeof TEST_MATCHES[0], postTypeId: string) {
  // Local Frontspace uses storeId from x-store-id header, not as mutation argument
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        slug
        title
      }
    }
  `;

  const variables = {
    input: {
      postTypeId, // Required for creating posts
      title: match.title,
      slug: match.slug,
      content: match.content, // Send as object, not JSON string
      status: 'published',
    },
  };

  console.log('📤 Creating match with variables:', JSON.stringify(variables, null, 2));

  const response = await fetch(FRONTSPACE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': FRONTSPACE_STORE_ID,
      ...(FRONTSPACE_API_KEY && { 'Authorization': `Bearer ${FRONTSPACE_API_KEY}` }),
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await response.json();
  console.log('📥 Create response:', JSON.stringify(result, null, 2));
  return result;
}

export async function POST(_request: NextRequest) {
  console.log('🧪 Creating test matches...');

  const postTypeId = MATCHER_POST_TYPE_ID;

  const results = [];

  for (const match of TEST_MATCHES) {
    try {
      const result = await createTestMatch(match, postTypeId);
      const success = !result.errors && result.data?.createPost;
      results.push({
        title: match.title,
        success,
        data: result.data?.createPost,
        error: result.errors?.[0]?.message,
      });
      if (success) {
        console.log(`✅ Created: ${match.title}`);
      } else {
        console.error(`❌ Failed: ${match.title}`, result.errors?.[0]?.message);
      }
    } catch (error) {
      results.push({
        title: match.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error(`❌ Failed: ${match.title}`, error);
    }
  }

  return NextResponse.json({
    message: 'Test matches created',
    results,
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to create 2 test matches',
    matches: TEST_MATCHES.map(m => ({ title: m.title, date: m.content.datum })),
  });
}
