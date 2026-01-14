'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  HardDrive,
  Activity,
  AlertCircle
} from 'lucide-react';

import GoogleDriveConnector from '@/components/GoogleDriveConnector';
import FolderSelector from '@/components/FolderSelector';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import StatCard from '@/components/dashboard/StatCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import StorageChart from '@/components/dashboard/StorageChart';

function DashboardContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth checks
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
    if (oauthStatus) {
      // Use setTimeout to avoid synchronous state update during render
      setTimeout(() => {
        if (oauthStatus === 'success') {
          const email = searchParams.get('email');
          setOauthMessage({
            type: 'success',
            text: `Successfully connected to Google Drive${email ? ` as ${email}` : ''}`,
          });
          router.replace('/dashboard');
        } else if (oauthStatus === 'error') {
          const error = searchParams.get('error');
          setOauthMessage({
            type: 'error',
            text: `Failed to connect Google Drive: ${error || 'Unknown error'}`,
          });
          router.replace('/dashboard');
        }
      }, 0);
    }
  }, [searchParams, router]);

  // Get tenant_id
  useEffect(() => {
    const fetchTenantId = async () => {
      if (!user) return;
      try {
        const metadataTenantId = user.user_metadata?.tenant_id;
        if (metadataTenantId) {
          setTenantId(metadataTenantId);
          return;
        }
        const response = await fetch('/api/tenants/list');
        const data = await response.json();
        if (data.success && data.tenants && data.tenants.length > 0) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-white/20"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-8">
            Access to the Knowledge Management System requires authentication.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Dashboard Layout ---
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto space-y-8"
          >
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Overview of your knowledge base and system status.
              </p>
            </div>

            {/* OAuth Messages */}
            {oauthMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-xl border flex items-center justify-between ${oauthMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle size={20} />
                  <span>{oauthMessage.text}</span>
                </div>
                <button onClick={() => setOauthMessage(null)} className="opacity-60 hover:opacity-100">×</button>
              </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Documents"
                value="1,284"
                trend="12%"
                trendUp={true}
                icon={FileText}
                color="bg-indigo-500"
                delay={0.1}
              />
              <StatCard
                title="Active Users"
                value="42"
                trend="5%"
                trendUp={true}
                icon={Users}
                color="bg-violet-500"
                delay={0.2}
              />
              <StatCard
                title="Storage Used"
                value="4.2 GB"
                trend="8%"
                trendUp={false}
                icon={HardDrive}
                color="bg-pink-500"
                delay={0.3}
              />
              <StatCard
                title="System Health"
                value="98%"
                icon={Activity}
                color="bg-emerald-500"
                delay={0.4}
              />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2/3) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Integration Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Integrations</h2>
                      <p className="text-sm text-gray-500">Manage your connected sources</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>

                  {tenantId ? (
                    <div className="space-y-6">
                      <GoogleDriveConnector
                        tenantId={tenantId}
                        onConnected={() => setOauthMessage({ type: 'success', text: 'Google Drive connected successfully!' })}
                        onDisconnected={() => setOauthMessage({ type: 'success', text: 'Google Drive disconnected.' })}
                      />
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <FolderSelector
                          tenantId={tenantId}
                          currentFolderId={currentFolderId}
                          onFolderSelected={(folderId) => {
                            setCurrentFolderId(folderId);
                            setOauthMessage({ type: 'success', text: 'Folder selected successfully!' });
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm">
                      ⚠️ Tenant ID not available. Please contact support.
                    </div>
                  )}
                </motion.div>

                {/* Recent Activity */}
                <div className="h-[400px]">
                  <RecentActivity />
                </div>
              </div>

              {/* Right Column (1/3) */}
              <div className="space-y-8">
                <div className="h-[400px]">
                  <StorageChart />
                </div>

                {/* Quick Actions / Tips */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg"
                >
                  <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
                  <p className="text-indigo-100 text-sm mb-4">
                    Connect more data sources to improve search accuracy. The more you connect, the smarter the Knowledge Base becomes.
                  </p>
                  <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm border border-white/10">
                    View Documentation
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-indigo-600 font-medium animate-pulse">Loading dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
