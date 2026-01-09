# Update test-supabase.js to test insert again
@"
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ulqlsvhyietwmpdszebm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVscWxzdmh5aWV0d21wZHN6ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTE0MjgsImV4cCI6MjA4MzQ2NzQyOH0.zMqwspjCO5I2iiiQHpH2CH5nOJ8ULohQFdYRMne4J68'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('Testing insert with RLS policies...')
  
  const testTenant = {
    name: 'Development BPO',
    slug: 'dev-bpo',
    subscription_tier: 'basic',
    settings: { sync_interval_minutes: 5 },
    is_active: true
  }
  
  const { data, error } = await supabase
    .from('tenants')
    .insert([testTenant])
    .select()
  
  if (error) {
    console.log('❌ Insert failed:', error.message)
    console.log('Make sure you ran the RLS policies SQL above')
  } else {
    console.log('✅ Insert successful!')
    console.log('Created tenant:', data[0])
    
    // Now query to verify
    const { data: tenants, error: queryError } = await supabase
      .from('tenants')
      .select('*')
    
    if (queryError) {
      console.log('Query error:', queryError.message)
    } else {
      console.log(\`Total tenants: \${tenants.length}\`)
      tenants.forEach(t => console.log(\` - \${t.name} (\${t.slug})\`))
    }
  }
}

testInsert()
"@ | Set-Content -FilePath test-insert-final.js -Encoding UTF8

node test-insert-final.js