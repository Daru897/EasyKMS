/**
 * Test Script: Document Indexing
 *
 * Tests the indexing API endpoint
 *
 * Usage:
 *   node scripts/test-indexing.js
 *
 * Prerequisites:
 *   - Server running at http://localhost:3000
 *   - Valid OPENAI_API_KEY in .env.local
 *   - Existing document in database
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testServiceStatus() {
  console.log('\n=== Testing Service Status ===\n');

  try {
    const response = await fetch(`${BASE_URL}/api/index/document`);
    const data = await response.json();

    console.log('Service Status:', JSON.stringify(data, null, 2));

    if (data.embeddingService?.ready) {
      console.log('\n✅ Embedding service is ready');
    } else {
      console.log('\n⚠️  Embedding service not ready:', data.embeddingService?.message);
    }

    return data.embeddingService?.ready;
  } catch (error) {
    console.error('❌ Failed to check service status:', error.message);
    return false;
  }
}

async function testIndexDocument(documentId, versionId, tenantId) {
  console.log('\n=== Testing Document Indexing ===\n');

  try {
    const response = await fetch(`${BASE_URL}/api/index/document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        versionId,
        tenantId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Indexing successful');
      console.log('   Chunks indexed:', data.chunksIndexed);
      console.log('   Total tokens:', data.totalTokens);
    } else {
      console.log('❌ Indexing failed:', data.error || data.message);
    }

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testUnindexDocument(versionId, tenantId) {
  console.log('\n=== Testing Document Unindexing ===\n');

  try {
    const response = await fetch(`${BASE_URL}/api/index/document`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        versionId,
        tenantId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Unindexing successful');
    } else {
      console.log('❌ Unindexing failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('  Document Indexing Test Script');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);

  // Check service status first
  const isReady = await testServiceStatus();

  if (!isReady) {
    console.log('\n⚠️  Service not ready. Please configure OPENAI_API_KEY.');
    console.log('   See RAG_CLAUDE_IMPLEMENTATION.md for setup instructions.\n');
    return;
  }

  // Example test values - replace with real IDs from your database
  const TEST_DOCUMENT_ID = process.env.TEST_DOCUMENT_ID || 'your-document-id';
  const TEST_VERSION_ID = process.env.TEST_VERSION_ID || 'your-version-id';
  const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'your-tenant-id';

  if (TEST_DOCUMENT_ID === 'your-document-id') {
    console.log('\n⚠️  No test document configured.');
    console.log('   Set environment variables:');
    console.log('   - TEST_DOCUMENT_ID');
    console.log('   - TEST_VERSION_ID');
    console.log('   - TEST_TENANT_ID\n');
    console.log('   Or replace the values in this script.\n');
    return;
  }

  // Test indexing
  await testIndexDocument(TEST_DOCUMENT_ID, TEST_VERSION_ID, TEST_TENANT_ID);

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================\n');
}

main().catch(console.error);
