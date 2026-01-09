// test-connection.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    const { data, error } = await supabase.from('tenants').select('count')
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
    } else {
      console.log('✅ Connection successful!')
      console.log(`📊 Tenants count: ${data[0]?.count || 0}`)
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

testConnection()