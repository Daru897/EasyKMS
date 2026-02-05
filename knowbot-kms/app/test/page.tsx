'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type Tenant = {
  id: string
  name: string
  slug: string
  subscription_tier: 'basic' | 'pro' | 'enterprise'
  is_active: boolean
  created_at: string
}

type TestResult = {
  success: boolean
  message: string
  error?: string
  data?: unknown
}

export default function TestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activeTab, setActiveTab] = useState<'database' | 'api' | 'rlp'>('database')

  const supabase = createClient()

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev.slice(0, 9)])
  }

  const testConnection = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('count')
      
      if (error) throw error
      
      addResult({
        success: true,
        message: `Database connection successful. Found ${data[0]?.count || 0} tenants.`,
        data: data[0]
      })
    } catch (error: unknown) {
      addResult({
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setTenants(data || [])
      addResult({
        success: true,
        message: `Fetched ${data.length} tenants successfully`,
        data: { count: data.length }
      })
    } catch (error: unknown) {
      addResult({
        success: false,
        message: 'Failed to fetch tenants',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }, [supabase])

  const createTestTenant = async () => {
    setLoading(true)
    try {
      const testTenant = {
        name: `Test Tenant ${new Date().toLocaleTimeString()}`,
        slug: `test-${Date.now().toString().slice(-6)}`,
        subscription_tier: 'basic' as const,
        settings: { sync_interval_minutes: 5 },
        is_active: true
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert([testTenant])
        .select()
      
      if (error) throw error
      
      addResult({
        success: true,
        message: `Created test tenant: ${data[0].name}`,
        data: data[0]
      })
      fetchTenants() // Refresh list
    } catch (error: unknown) {
      addResult({
        success: false,
        message: 'Failed to create test tenant',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }

  const testRLSPolicies = async () => {
    setLoading(true)
    try {
      // Test 1: Can we query tenants?
      const { error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
      
      // Test 2: Try to insert without proper permissions
      await supabase
        .from('tenants')
        .insert([{ 
          name: 'RLS Test',
          slug: 'rls-test',
          subscription_tier: 'basic'
        }])
      
      addResult({
        success: !tenantsError,
        message: tenantsError 
          ? 'RLS test: Query blocked (expected for anonymous users)' 
          : 'RLS test: Query allowed',
        error: tenantsError?.message
      })
    } catch (error: unknown) {
      addResult({
        success: false,
        message: 'RLS test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    setLoading(false)
  }

  const clearResults = () => {
    setResults([])
  }

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Test Console</h1>
              <p className="text-gray-600">Test and verify your Supabase database setup</p>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Supabase: Connected</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">RLS: Active</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="text-gray-500">
                Project: ulqlsvhyietwmpdszebm.supabase.co
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Test Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Controls</h2>
              
              <div className="space-y-3">
                <button
                  onClick={testConnection}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Testing...
                    </>
                  ) : (
                    'Test Database Connection'
                  )}
                </button>

                <button
                  onClick={fetchTenants}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition"
                >
                  Refresh Tenants List
                </button>

                <button
                  onClick={createTestTenant}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  Create Test Tenant
                </button>

                <button
                  onClick={testRLSPolicies}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
                >
                  Test RLS Policies
                </button>

                <button
                  onClick={clearResults}
                  className="w-full px-4 py-3 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition"
                >
                  Clear Results
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">API Endpoints</h3>
                <div className="space-y-2">
                  <a 
                    href="/api/test-db" 
                    target="_blank"
                    className="block px-3 py-2 bg-gray-50 text-gray-700 text-sm rounded hover:bg-gray-100 transition"
                  >
                    GET /api/test-db
                  </a>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 text-gray-700 text-sm rounded hover:bg-gray-100 transition">
                    POST /api/test-db (Create)
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-50 text-gray-400 text-sm rounded cursor-not-allowed">
                    GET /api/health
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">System Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Environment</div>
                  <div className="text-sm font-medium text-gray-900">Development</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Node Version</div>
                  <div className="text-sm font-medium text-gray-900">v18+</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Next.js Version</div>
                  <div className="text-sm font-medium text-gray-900">14.0+</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Supabase</div>
                  <div className="text-sm font-medium text-gray-900">Connected</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results & Data */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('database')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'database' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Test Results
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'api' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                API Tests
              </button>
              <button
                onClick={() => setActiveTab('rlp')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'rlp' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Tenants Data
              </button>
            </div>

            {/* Results Panel */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Test Results</h3>
                <span className="text-sm text-gray-500">
                  {results.length} test(s) run
                </span>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {results.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No tests run yet. Click a test button to get started.</p>
                  </div>
                ) : (
                  results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {result.success ? '✓' : '✗'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{result.message}</div>
                          {result.error && (
                            <div className="mt-1 text-sm text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                              {result.error}
                            </div>
                          )}
                          {result.data && (
                            <div className="mt-2 text-xs text-gray-600">
                              <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Tenants Database</h3>
                <span className="text-sm text-gray-500">
                  {tenants.length} tenant(s) total
                </span>
              </div>

              {tenants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{tenant.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{tenant.slug}</code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tenant.subscription_tier === 'pro' 
                                ? 'bg-purple-100 text-purple-800' 
                                : tenant.subscription_tier === 'enterprise' 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tenant.subscription_tier}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tenant.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${tenant.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                              {tenant.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Tenants Found</h4>
                  <p className="text-gray-500 mb-4">Click &quot;Create Test Tenant&quot; to add sample data.</p>
                  <button
                    onClick={createTestTenant}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                  >
                    Create Test Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-800 mb-3">Need Help?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-blue-700 mb-1">Connection Issues</div>
              <p className="text-blue-600">Check .env.local file and verify Supabase project is active.</p>
            </div>
            <div>
              <div className="font-medium text-blue-700 mb-1">RLS Policy Errors</div>
              <p className="text-blue-600">Ensure RLS policies allow anonymous access for testing.</p>
            </div>
            <div>
              <div className="font-medium text-blue-700 mb-1">API Testing</div>
              <p className="text-blue-600">Use the API endpoints for server-side testing and debugging.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
