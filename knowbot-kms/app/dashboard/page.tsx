'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GoogleDriveConnector from '@/components/GoogleDriveConnector';
import FolderSelector from '@/components/FolderSelector';

function DashboardContent() {
  const { user, session, isLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // NEW APPROACH: No redirects - just show content conditionally
  // This eliminates redirect loops completely
  useEffect(() => {
    if (user && !isLoading) {
      console.log('[Dashboard] ✅ User authenticated:', user.email);
    } else if (!isLoading && !user) {
      console.log('[Dashboard] ⚠️ No user found - showing login prompt');
    }
  }, [user, isLoading]);

  // Handle OAuth callback messages
  useEffect(() => {
    const oauthStatus = searchParams.get('google_oauth');
    if (oauthStatus === 'success') {
      const email = searchParams.get('email');
      setOauthMessage({
        type: 'success',
        text: `Successfully connected to Google Drive${email ? ` as ${email}` : ''}`,
      });
      // Clear URL params
      router.replace('/dashboard');
    } else if (oauthStatus === 'error') {
      const error = searchParams.get('error');
      setOauthMessage({
        type: 'error',
        text: `Failed to connect Google Drive: ${error || 'Unknown error'}`,
      });
      // Clear URL params
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  // Get tenant_id from user metadata or fetch from database
  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user) return;

      try {
        // Option 1: Check user metadata
        const metadataTenantId = user.user_metadata?.tenant_id;
        if (metadataTenantId) {
          setTenantId(metadataTenantId);
          return;
        }

        // Option 2: Fetch first available tenant (for testing)
        // In production, you'd have a proper tenant-user relationship
        const response = await fetch('/api/tenants/list');
        const data = await response.json();
        
        if (data.success && data.tenants && data.tenants.length > 0) {
          // Use first tenant for now
          setTenantId(data.tenants[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch tenant ID:', error);
      }
    };

    if (user && !tenantId) {
      fetchTenantId();
    }
  }, [user, tenantId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading user session...</div>
      </div>
    );
  }

  // NEW APPROACH: Show login prompt instead of redirecting
  // This prevents redirect loops and gives user control
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to access the dashboard.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Rest of your dashboard code remains the same...
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with user info */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              BPO Knowledge Management System
            </h1>
            <p className="text-lg text-gray-600">
              Welcome back, {user.email} • Stage 2 - Multi-Tenant Foundation Setup
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-semibold">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* OAuth Message */}
        {oauthMessage && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              oauthMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{oauthMessage.text}</span>
              <button
                onClick={() => setOauthMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Google Drive Integration Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Google Drive Integration
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your Google Drive to automatically sync SOP documents. Select a folder to monitor for changes.
          </p>

          {tenantId ? (
            <div className="space-y-6">
              <GoogleDriveConnector
                tenantId={tenantId}
                onConnected={() => {
                  setOauthMessage({
                    type: 'success',
                    text: 'Google Drive connected successfully!',
                  });
                }}
                onDisconnected={() => {
                  setOauthMessage({
                    type: 'success',
                    text: 'Google Drive disconnected.',
                  });
                }}
              />

              {/* Folder Selector - Show only if connected */}
              <div className="mt-6">
                <FolderSelector
                  tenantId={tenantId}
                  currentFolderId={currentFolderId}
                  onFolderSelected={(folderId) => {
                    setCurrentFolderId(folderId);
                    setOauthMessage({
                      type: 'success',
                      text: 'Folder selected successfully!',
                    });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium mb-2">
                ⚠️ Tenant ID not set
              </p>
              <p className="text-sm text-yellow-700 mb-3">
                To test Google Drive integration, you need a tenant ID. Options:
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Option 1:</strong> Create a tenant via API:
                  <code className="block mt-1 p-2 bg-yellow-100 rounded text-xs">
                    {`curl -X POST http://localhost:3000/api/test-db -H "Content-Type: application/json" -d '{"name": "Test Company", "slug": "test-company"}'`}
                  </code>
                </div>
                <div>
                  <strong>Option 2:</strong> Create in database:
                  <code className="block mt-1 p-2 bg-yellow-100 rounded text-xs">
                    INSERT INTO tenants (name, slug) VALUES ('Test', 'test') RETURNING id;
                  </code>
                </div>
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/tenants/list');
                        const data = await response.json();
                        if (data.success && data.tenants?.length > 0) {
                          setTenantId(data.tenants[0].id);
                        } else {
                          alert('No tenants found. Please create one first.');
                        }
                      } catch (error) {
                        alert('Failed to load tenants');
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    Try to Load Existing Tenant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Your dashboard stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* ... rest of your dashboard HTML ... */}
        </div>
        
        {/* ... rest of your dashboard HTML remains exactly the same ... */}
        
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}