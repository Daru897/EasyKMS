/* eslint-disable @typescript-eslint/no-require-imports */
// test-supabase.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('Testing insert with RLS policies...')
  
  const testTenant = {
    name: 'Development BPO',
    slug: `dev-bpo-${Date.now().toString().slice(-6)}`,
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
    
    const { data: tenants, error: queryError } = await supabase
      .from('tenants')
      .select('*')
    
    if (queryError) {
      console.log('Query error:', queryError.message)
    } else {
      console.log(`Total tenants: ${tenants.length}`)
      tenants.forEach(t => console.log(` - ${t.name} (${t.slug})`))
    }
  }
}

testInsert()
