import { NextResponse } from 'next/server';
import { getPineconeClient, getPineconeIndexName, validateTenantId, tenantIdToNamespace } from '@/lib/pinecone';
import { queryVectors, upsertVectors, getNamespaceStats } from '@/utils/pinecone/server';

/**
 * Test endpoint for Pinecone namespace wrapper
 * GET /api/pinecone/test?tenantId=<uuid>&action=<action>
 * 
 * Actions:
 * - health: Check Pinecone connection
 * - namespace: Get namespace for tenant
 * - stats: Get namespace statistics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const action = searchParams.get('action') || 'health';

    // Health check (no tenant required)
    if (action === 'health') {
      const client = getPineconeClient();
      const indexName = getPineconeIndexName();
      
      try {
        const index = client.index(indexName);
        const stats = await index.describeIndexStats();
        
        return NextResponse.json({
          success: true,
          action: 'health',
          message: 'Pinecone connection successful',
          index: {
            name: indexName,
            dimension: stats.dimension,
            indexFullness: stats.indexFullness,
            totalRecordCount: stats.totalRecordCount,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          action: 'health',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // All other actions require tenantId
    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'tenantId query parameter is required',
        example: `${request.url}?tenantId=<uuid>&action=namespace`,
      }, { status: 400 });
    }

    const validatedTenantId = validateTenantId(tenantId);
    const namespace = tenantIdToNamespace(validatedTenantId);

    // Get namespace info
    if (action === 'namespace') {
      return NextResponse.json({
        success: true,
        action: 'namespace',
        tenantId: validatedTenantId,
        namespace: namespace,
        message: 'Namespace generated successfully',
      });
    }

    // Get namespace stats
    if (action === 'stats') {
      try {
        const stats = await getNamespaceStats(validatedTenantId);
        return NextResponse.json({
          success: true,
          action: 'stats',
          tenantId: validatedTenantId,
          namespace: namespace,
          stats: stats,
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          action: 'stats',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: `Unknown action: ${action}`,
      availableActions: ['health', 'namespace', 'stats'],
    }, { status: 400 });

  } catch (error) {
    console.error('[Pinecone Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST endpoint for testing upsert/query operations
 * POST /api/pinecone/test
 * Body: { tenantId, action: 'upsert' | 'query', ... }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantId, action, ...options } = body;

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'tenantId is required in request body',
      }, { status: 400 });
    }

    const validatedTenantId = validateTenantId(tenantId);

    // Test upsert (with dummy data)
    if (action === 'upsert') {
      const testVectors = [
        {
          id: `test-${Date.now()}-1`,
          values: new Array(1536).fill(0).map(() => Math.random()), // Mock 1536-dim vector
          metadata: {
            test: true,
            timestamp: new Date().toISOString(),
            tenant_id: validatedTenantId,
          },
        },
      ];

      try {
        const result = await upsertVectors(validatedTenantId, testVectors);
        return NextResponse.json({
          success: true,
          action: 'upsert',
          message: 'Test vector upserted successfully',
          result: result,
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          action: 'upsert',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // Test query
    if (action === 'query') {
      const queryVector = options.queryVector || new Array(1536).fill(0).map(() => Math.random());
      
      try {
        const result = await queryVectors(validatedTenantId, queryVector, {
          topK: options.topK || 5,
        });
        return NextResponse.json({
          success: true,
          action: 'query',
          message: 'Query executed successfully',
          result: {
            matchCount: result.matches?.length || 0,
            matches: result.matches?.slice(0, 3), // Return first 3 for brevity
          },
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          action: 'query',
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: `Unknown action: ${action}`,
      availableActions: ['upsert', 'query'],
    }, { status: 400 });

  } catch (error) {
    console.error('[Pinecone Test POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
