/**
 * Health Check Script
 * Tests all implemented components
 * 
 * Usage: node scripts/test-health.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INNGEST_URL = 'http://localhost:8288';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(endpoint, description) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.success !== false && response.ok) {
      log(`✅ ${description}`, 'green');
      return { success: true, data };
    } else {
      log(`❌ ${description}: ${data.error || 'Failed'}`, 'red');
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    log(`❌ ${description}: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n=== Health Check ===\n', 'blue');

  const results = {
    database: false,
    pinecone: false,
    inngest: false,
  };

  // Test 1: Database
  log('1. Testing Database Connection...', 'yellow');
  const dbResult = await test(
    `${BASE_URL}/api/test-db?action=health`,
    'Database connection'
  );
  results.database = dbResult.success;

  // Test 2: Pinecone
  log('\n2. Testing Pinecone Connection...', 'yellow');
  const pineconeResult = await test(
    `${BASE_URL}/api/pinecone/test?action=health`,
    'Pinecone connection'
  );
  results.pinecone = pineconeResult.success;

  // Test 3: Inngest
  log('\n3. Testing Inngest...', 'yellow');
  try {
    const response = await fetch(`${INNGEST_URL}/api/health`);
    if (response.ok) {
      log('✅ Inngest dev server running', 'green');
      results.inngest = true;
    } else {
      log('❌ Inngest dev server not responding', 'red');
      results.inngest = false;
    }
  } catch (error) {
    log(`❌ Inngest: ${error.message}`, 'red');
    log('   Note: Start Inngest with: npx inngest-cli dev', 'yellow');
    results.inngest = false;
  }

  // Summary
  log('\n=== Summary ===', 'blue');
  log(`Database: ${results.database ? '✅' : '❌'}`, results.database ? 'green' : 'red');
  log(`Pinecone: ${results.pinecone ? '✅' : '❌'}`, results.pinecone ? 'green' : 'red');
  log(`Inngest: ${results.inngest ? '✅' : '❌'}`, results.inngest ? 'green' : 'red');

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n✅ All systems operational!', 'green');
  } else {
    log('\n⚠️  Some systems need attention', 'yellow');
    log('\nNext steps:', 'blue');
    if (!results.database) {
      log('  - Check Supabase connection and environment variables', 'yellow');
    }
    if (!results.pinecone) {
      log('  - Check PINECONE_API_KEY and index exists', 'yellow');
    }
    if (!results.inngest) {
      log('  - Start Inngest: npx inngest-cli dev', 'yellow');
    }
  }

  log('\n');
}

main().catch(console.error);
