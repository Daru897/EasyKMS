/**
 * Test Script: Semantic Query
 *
 * Tests the query API endpoint
 *
 * Usage:
 *   node scripts/test-query.js
 *   node scripts/test-query.js "your search query"
 *
 * Prerequisites:
 *   - Server running at http://localhost:3000
 *   - Valid OPENAI_API_KEY in .env.local
 *   - Indexed documents in Pinecone
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testServiceStatus() {
  console.log('\n=== Testing Query Service Status ===\n');

  try {
    const response = await fetch(`${BASE_URL}/api/query`);
    const data = await response.json();

    console.log('Service Status:', JSON.stringify(data, null, 2));

    return data.embeddingService?.ready;
  } catch (error) {
    console.error('❌ Failed to check service status:', error.message);
    return false;
  }
}

async function testQuery(query, tenantId, options = {}) {
  console.log('\n=== Testing Semantic Query ===\n');
  console.log(`Query: "${query}"`);
  console.log(`Tenant: ${tenantId}`);

  try {
    const response = await fetch(`${BASE_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        tenantId,
        options,
      }),
    });

    const data = await response.json();

    console.log('\n--- Response ---');
    console.log('Type:', data.type);
    console.log('Success:', data.success);
    console.log('Total Matches:', data.totalMatches);
    console.log('Message:', data.message);

    if (data.knowledgeGapLogged) {
      console.log('\n⚠️  Knowledge gap logged for review');
    }

    if (data.results && data.results.length > 0) {
      console.log('\n--- Results ---\n');

      data.results.forEach((result, index) => {
        console.log(`[${index + 1}] ${result.documentTitle}`);
        console.log(`    Score: ${result.bestScore.toFixed(4)}`);
        console.log(`    Status: ${result.documentStatus}`);

        if (result.categories && result.categories.length > 0) {
          console.log(`    Categories: ${result.categories.join(', ')}`);
        }

        if (result.chunks && result.chunks.length > 0) {
          console.log(`    Top chunk: "${result.chunks[0].text.slice(0, 100)}..."`);
        }

        console.log('');
      });
    }

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testSilenceProtocol(tenantId) {
  console.log('\n=== Testing Silence Protocol ===\n');
  console.log('Sending irrelevant query to test NO_DATA response...');

  const result = await testQuery(
    'quantum entanglement in parallel universes',
    tenantId,
    { topK: 3 }
  );

  if (result?.type === 'NO_DATA') {
    console.log('✅ Silence Protocol working correctly');
    console.log('   Irrelevant query returned NO_DATA');
    console.log('   Knowledge gap was logged:', result.knowledgeGapLogged);
  } else if (result?.type === 'SUCCESS') {
    console.log('⚠️  Unexpected SUCCESS response');
    console.log('   This might indicate indexed content matches the test query');
  }

  return result;
}

async function main() {
  console.log('========================================');
  console.log('  Semantic Query Test Script');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);

  // Check service status first
  const isReady = await testServiceStatus();

  if (!isReady) {
    console.log('\n⚠️  Service not ready. Please configure OPENAI_API_KEY.');
    console.log('   See RAG_CLAUDE_IMPLEMENTATION.md for setup instructions.\n');
    return;
  }

  // Get tenant ID from environment or use placeholder
  const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'your-tenant-id';

  if (TEST_TENANT_ID === 'your-tenant-id') {
    console.log('\n⚠️  No tenant configured.');
    console.log('   Set TEST_TENANT_ID environment variable.\n');
    return;
  }

  // Get query from command line or use default
  const query = process.argv[2] || 'How do I process a refund?';

  // Test regular query
  await testQuery(query, TEST_TENANT_ID, {
    topK: 5,
    includeContent: true,
  });

  // Test Silence Protocol
  await testSilenceProtocol(TEST_TENANT_ID);

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================\n');
}

main().catch(console.error);
