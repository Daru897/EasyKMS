'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, FileText, AlertCircle, Search, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/dashboard/StatCard';
import SyncStatusWidget from '@/components/admin/SyncStatusWidget';
import ApprovalQueueWidget from '@/components/admin/ApprovalQueueWidget';
import SystemHealthCard from '@/components/admin/SystemHealthCard';

interface DashboardStats {
  totalDocuments: number;
  liveDocuments: number;
  draftDocuments: number;
  knowledgeGaps: number;
}

function AdminDashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    liveDocuments: 0,
    draftDocuments: 0,
    knowledgeGaps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch document counts
        const [totalRes, liveRes, draftRes, gapsRes] = await Promise.all([
          fetch('/api/documents?limit=1'),
          fetch('/api/documents?status=LIVE&limit=1'),
          fetch('/api/documents?status=DRAFT&limit=1'),
          fetch('/api/knowledge-gaps?limit=1'),
        ]);

        const [totalData, liveData, draftData, gapsData] = await Promise.all([
          totalRes.json(),
          liveRes.json(),
          draftRes.json(),
          gapsRes.json(),
        ]);

        setStats({
          totalDocuments: totalData.pagination?.total || 0,
          liveDocuments: liveData.pagination?.total || 0,
          draftDocuments: draftData.pagination?.total || 0,
          knowledgeGaps: gapsData.pagination?.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl"
      >
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-gray-600 mb-8">
          Please sign in to access the Admin Control Center.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-200"
        >
          Go to Login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor and manage your knowledge management system
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={loading ? '...' : stats.totalDocuments.toString()}
          icon={FileText}
          color="bg-indigo-600"
          delay={0}
        />
        <StatCard
          title="Live Documents"
          value={loading ? '...' : stats.liveDocuments.toString()}
          icon={CheckSquare}
          color="bg-emerald-600"
          delay={0.1}
        />
        <StatCard
          title="Pending Approval"
          value={loading ? '...' : stats.draftDocuments.toString()}
          icon={FileText}
          color="bg-amber-600"
          delay={0.2}
        />
        <StatCard
          title="Knowledge Gaps"
          value={loading ? '...' : stats.knowledgeGaps.toString()}
          icon={AlertCircle}
          color="bg-red-600"
          delay={0.3}
        />
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SyncStatusWidget />
        <ApprovalQueueWidget delay={0.1} />
        <SystemHealthCard delay={0.2} />
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/admin/approvals')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <div className="p-2 bg-amber-100 rounded-lg">
              <CheckSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Review Documents</p>
              <p className="text-sm text-gray-500">Approve pending content</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/knowledge-gaps')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Knowledge Gaps</p>
              <p className="text-sm text-gray-500">View missing content</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/analytics')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Search className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">Usage statistics</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/documents')}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
          >
            <div className="p-2 bg-violet-100 rounded-lg">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">All Documents</p>
              <p className="text-sm text-gray-500">Browse knowledge base</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-indigo-600 font-medium animate-pulse">Loading dashboard...</div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
