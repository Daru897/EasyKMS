import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch, getQueryStats, type QueryOptions } from '@/utils/query/search';
import { getEmbeddingServiceStatus } from '@/utils/embeddings/openai-embed';

/**
 * POST /api/query
 *
 * Perform semantic search over indexed documents
 *
 * Body:
 * - query: string (required) - Natural language search query
 * - tenantId: string (required) - Tenant ID for namespace isolation
 * - options: QueryOptions (optional)
 *   - topK: number - Maximum results (default: 10)
 *   - similarityThreshold: number - Minimum score (default: 0.75)
 *   - documentStatus: string[] - Filter by status (default: ['LIVE'])
 *   - effectiveDate: string - Time-machine query date
 *   - categories: string[] - Filter by category names
 *   - includeContent: boolean - Include chunk text (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, tenantId, options = {} } = body;

    // Validate required fields
    if (!query || !tenantId) {
      return NextResponse.json(
        {
          type: 'ERROR',
          success: false,
          error: 'Missing required fields: query, tenantId',
          results: [],
        },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 1000) {
      return NextResponse.json(
        {
          type: 'ERROR',
          success: false,
          error: 'Query too long. Maximum 1000 characters.',
          results: [],
        },
        { status: 400 }
      );
    }

    // Build query options
    const queryOptions: QueryOptions = {
      topK: options.topK || 10,
      similarityThreshold: options.similarityThreshold,
      documentStatus: options.documentStatus,
      effectiveDate: options.effectiveDate,
      categories: options.categories,
      includeContent: options.includeContent !== false,
    };

    // Perform search
    const result = await semanticSearch(query, tenantId, queryOptions);

    // Return appropriate status code based on result type
    if (result.type === 'ERROR') {
      return NextResponse.json(
        {
          type: result.type,
          success: false,
          error: result.message,
          results: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      type: result.type,
      success: result.type === 'SUCCESS',
      query: result.query,
      totalMatches: result.totalMatches,
      message: result.message,
      results: result.results,
      knowledgeGapLogged: result.knowledgeGapLogged,
    });
  } catch (error) {
    console.error('[API] Query error:', error);
    return NextResponse.json(
      {
        type: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        results: [],
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/query
 *
 * Get query service status and stats
 *
 * Query params:
 * - tenantId: string (optional) - Get stats for specific tenant
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenantId');

  const embeddingStatus = getEmbeddingServiceStatus();

  const response: Record<string, any> = {
    service: 'semantic-search',
    embeddingService: embeddingStatus,
    silenceProtocol: {
      enabled: true,
      threshold: 0.75,
      description: 'Queries below similarity threshold return NO_DATA and log knowledge gaps',
    },
    endpoints: {
      'POST /api/query': 'Perform semantic search',
      'GET /api/query?tenantId=xxx': 'Get service status and tenant stats',
    },
  };

  // Include tenant stats if requested
  if (tenantId) {
    try {
      const stats = await getQueryStats(tenantId);
      response.tenantStats = stats;
    } catch (error) {
      response.tenantStats = {
        error: 'Failed to fetch tenant stats',
      };
    }
  }

  return NextResponse.json(response);
}
