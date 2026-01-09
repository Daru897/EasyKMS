import { createServiceClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('🧪 API Test Endpoint Called')
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '5')
    
    const supabase = createServiceClient()
    
    // Default: Comprehensive health check
    if (!action || action === 'health') {
      const [
        { data: tenants, error: tenantsError, count: tenantsCount },
        { data: documents, error: docsError, count: docsCount },
        { data: versions, error: versError, count: versCount }
      ] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: false }).limit(limit),
        supabase.from('documents').select('*', { count: 'exact', head: false }).limit(limit),
        supabase.from('document_versions').select('*', { count: 'exact', head: false }).limit(limit)
      ])
      
      const duration = Date.now() - startTime
      
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        environment: process.env.NODE_ENV,
        database: {
          status: 'connected',
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '').split('.')[0],
          region: 'Unknown'
        },
        tables: {
          tenants: {
            count: tenantsCount || 0,
            status: tenantsError ? 'error' : 'ok',
            error: tenantsError?.message,
            sample: tenants?.slice(0, 3)
          },
          documents: {
            count: docsCount || 0,
            status: docsError ? 'error' : 'ok',
            error: docsError?.message,
            sample: documents?.slice(0, 2)
          },
          document_versions: {
            count: versCount || 0,
            status: versError ? 'error' : 'ok',
            error: versError?.message,
            sample: versions?.slice(0, 2)
          }
        },
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          node: process.version
        }
      })
    }
    
    // Action: test-connection
    if (action === 'test-connection') {
      const { data, error } = await supabase
        .from('tenants')
        .select('count')
        .single()
      
      const duration = Date.now() - startTime
      
      return NextResponse.json({
        success: !error,
        action: 'test-connection',
        duration: `${duration}ms`,
        result: {
          connected: !error,
          tenantCount: data?.count || 0,
          error: error?.message
        }
      })
    }
    
    // Action: create-test-data
    if (action === 'create-test-data') {
      const testTenant = {
        name: `API Test Tenant ${new Date().toISOString().slice(11, 19)}`,
        slug: `api-test-${Date.now().toString().slice(-6)}`,
        subscription_tier: 'basic' as const,
        settings: { 
          sync_interval_minutes: 5,
          created_via: 'api-test',
          timestamp: new Date().toISOString()
        },
        is_active: true
      }
      
      const { data, error } = await supabase
        .from('tenants')
        .insert([testTenant])
        .select()
        .single()
      
      const duration = Date.now() - startTime
      
      if (error) {
        return NextResponse.json({
          success: false,
          action: 'create-test-data',
          duration: `${duration}ms`,
          error: error.message,
          details: error
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        action: 'create-test-data',
        duration: `${duration}ms`,
        tenant: data,
        message: 'Test tenant created successfully'
      })
    }
    
    // Default response for unknown action
    return NextResponse.json({
      success: false,
      error: 'Unknown action',
      available_actions: ['health', 'test-connection', 'create-test-data'],
      example: `${request.url}?action=health&limit=10`
    }, { status: 400 })
    
  } catch (err: any) {
    console.error('❌ API Error:', err)
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('📝 API POST: Creating test data')
    
    const body = await request.json().catch(() => ({}))
    const { name, slug, tier = 'basic' } = body
    
    const supabase = createServiceClient()
    
    const tenantData = {
      name: name || `POST Test Tenant ${new Date().toISOString().slice(11, 19)}`,
      slug: slug || `post-test-${Date.now().toString().slice(-6)}`,
      subscription_tier: (tier === 'pro' || tier === 'enterprise' ? tier : 'basic') as 'basic' | 'pro' | 'enterprise',
      settings: { 
        created_via: 'api-post',
        method: 'POST',
        body_received: Object.keys(body).length > 0 ? body : 'empty'
      },
      is_active: true
    }
    
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single()
    
    const duration = Date.now() - startTime
    
    if (error) {
      return NextResponse.json({
        success: false,
        method: 'POST',
        duration: `${duration}ms`,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      method: 'POST',
      duration: `${duration}ms`,
      message: 'Tenant created successfully via POST',
      tenant: data,
      request_body: body,
      timestamp: new Date().toISOString()
    })
    
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      method: 'POST',
      error: err.message,
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    message: 'DELETE method not implemented for safety',
    note: 'Use Supabase dashboard or direct SQL for deletion'
  }, { status: 405 })
}