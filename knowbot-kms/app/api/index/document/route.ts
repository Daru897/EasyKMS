import { NextRequest, NextResponse } from 'next/server';
import { indexDocumentVersion, unindexDocumentVersion, reindexTenantDocuments } from '@/utils/embeddings/indexing';
import { getEmbeddingServiceStatus } from '@/utils/embeddings/openai-embed';

/**
 * POST /api/index/document
 *
 * Index a document version into the vector database
 *
 * Body:
 * - documentId: string (required)
 * - versionId: string (required)
 * - tenantId: string (required)
 * - options: { chunkSize?: number, overlapSize?: number } (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, versionId, tenantId, options } = body;

    // Validate required fields
    if (!documentId || !versionId || !tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: documentId, versionId, tenantId',
        },
        { status: 400 }
      );
    }

    // Index the document
    const result = await indexDocumentVersion(documentId, versionId, tenantId, options || {});

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          documentId,
          versionId,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      versionId: result.versionId,
      chunksIndexed: result.chunksIndexed,
      totalTokens: result.totalTokens,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] Index document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/index/document
 *
 * Remove vectors for a document version
 *
 * Body:
 * - versionId: string (required)
 * - tenantId: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { versionId, tenantId } = body;

    // Validate required fields
    if (!versionId || !tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: versionId, tenantId',
        },
        { status: 400 }
      );
    }

    // Unindex the document version
    const result = await unindexDocumentVersion(versionId, tenantId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      versionId,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] Unindex document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/index/document
 *
 * Get embedding service status
 */
export async function GET() {
  const status = getEmbeddingServiceStatus();

  return NextResponse.json({
    service: 'document-indexing',
    embeddingService: status,
    endpoints: {
      'POST /api/index/document': 'Index a document version',
      'DELETE /api/index/document': 'Remove document version vectors',
    },
  });
}

/**
 * PUT /api/index/document
 *
 * Reindex all documents for a tenant
 *
 * Body:
 * - tenantId: string (required)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: tenantId',
        },
        { status: 400 }
      );
    }

    const result = await reindexTenantDocuments(tenantId);

    return NextResponse.json({
      success: result.success,
      indexed: result.indexed,
      failed: result.failed,
      message: result.success
        ? `Reindexed ${result.indexed} documents`
        : `Reindexing completed with ${result.failed} failures`,
    });
  } catch (error) {
    console.error('[API] Reindex tenant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
