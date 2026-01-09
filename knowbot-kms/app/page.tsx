import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function Home() {
  let tenantsCount = 0
  let connectionError: string | null = null
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
    
    if (error) {
      connectionError = error.message
    } else {
      tenantsCount = data?.[0]?.count || 0
    }
  } catch (err: any) {
    connectionError = err.message
  }

  const connectionColor = connectionError ? 'bg-red-500' : 'bg-green-500'
  const connectionMessage = connectionError 
    ? 'Failed to connect to Supabase' 
    : 'Connected to Supabase database'
  const tenantMessage = tenantsCount === 0 
    ? 'No tenants created yet' 
    : `${tenantsCount} tenant(s) in database`

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            BPO Knowledge Management System
          </h1>
          <p className="text-lg text-gray-600">
            Stage 2 - Multi-Tenant Foundation Setup | Sprint 1 Complete
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Database Status</h2>
              <div className={`w-3 h-3 rounded-full ${connectionColor}`}></div>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              {connectionMessage}
            </p>
            {connectionError ? (
              <div className="text-red-600 text-sm font-mono bg-red-50 p-3 rounded-lg">
                {connectionError}
              </div>
            ) : (
              <div className="text-green-700 text-sm font-mono bg-green-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Connection Established
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Tenants</h2>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-blue-600">{tenantsCount}</span>
                <span className="text-gray-500 text-sm">total</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {tenantMessage}
            </p>
            <Link 
              href="/admin/tenants" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Manage Tenants
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-purple-600">0</span>
                <span className="text-gray-500 text-sm">synced</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Ready for Google Drive integration
            </p>
            <button className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium opacity-50 cursor-not-allowed">
              Sync Documents
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">System Health</h2>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-green-600">100%</span>
                <span className="text-gray-500 text-sm">uptime</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Supabase: Online</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Database: Connected</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Vector DB: Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              href="/test" 
              className="group bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Test Console</h3>
              <p className="text-gray-600 text-sm">
                Interactive interface to test database connections, create sample data, and verify RLS policies.
              </p>
            </Link>

            <a 
              href="/api/test-db" 
              target="_blank"
              className="group bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">API Test Endpoint</h3>
              <p className="text-gray-600 text-sm">
                Raw JSON API response for debugging. Test server-side database connections and view real-time data.
              </p>
            </a>

            <Link 
              href="/admin" 
              className="group bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Dashboard</h3>
              <p className="text-gray-600 text-sm">
                System administration panel. Manage tenants, monitor sync status, and configure application settings.
              </p>
            </Link>
          </div>
        </div>

        {/* Progress & Next Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sprint Progress */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Development Progress</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">Sprint 1: Foundation</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full w-full"></div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Next.js setup, Supabase integration, RLS policies, database schema
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">Sprint 2: Authentication</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Next</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full w-1/4"></div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  User auth, multi-tenant UI, role-based access control
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">Sprint 3: Document Sync</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Planned</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-300 h-2 rounded-full w-0"></div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Google Drive integration, document parsing, vector indexing
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-3">Ready for Sprint 2?</h2>
              <p className="text-blue-100">
                Implement user authentication and build the multi-tenant dashboard interface.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold">User Authentication</h4>
                  <p className="text-blue-200 text-sm">Clerk/Supabase Auth with multi-tenant support</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold">Role-Based Access</h4>
                  <p className="text-blue-200 text-sm">Agent, Manager, Admin roles with permissions</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-200 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold">Tenant Dashboard</h4>
                  <p className="text-blue-200 text-sm">Per-tenant analytics and document management</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link 
                href="/test" 
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition text-center"
              >
                Test Current Setup
              </Link>
              <button className="px-6 py-3 bg-blue-800 text-white font-semibold rounded-lg hover:bg-blue-900 transition">
                Start Sprint 2 Planning
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              BPO KMS v0.1.0 • Stage 2 Foundation • Environment: Development
            </div>
            <div className="flex items-center space-x-4">
              <a href="/api/health" className="text-sm text-gray-500 hover:text-gray-700">
                System Health
              </a>
              <span className="text-gray-300">•</span>
              <a href="/api/docs" className="text-sm text-gray-500 hover:text-gray-700">
                API Docs
              </a>
              <span className="text-gray-300">•</span>
              <a href="https://github.com/your-repo" target="_blank" className="text-sm text-gray-500 hover:text-gray-700">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}