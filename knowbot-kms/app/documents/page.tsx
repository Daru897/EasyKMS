'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, FilePlus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import DocumentList from '@/components/documents/DocumentList';

type TabType = 'all' | 'DRAFT' | 'LIVE' | 'ARCHIVED';

const tabs: { key: TabType; label: string; count?: number }[] = [
  { key: 'all', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'LIVE', label: 'Live' },
  { key: 'ARCHIVED', label: 'Archived' },
];

function DocumentsContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
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
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-8">
            Please sign in to access documents.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-200"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

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
            className="max-w-7xl mx-auto space-y-6"
          >
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
                <p className="text-gray-600 mt-1">
                  Manage and approve your knowledge base documents
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Sync
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  <FilePlus className="w-4 h-4" />
                  Add Document
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="border-b border-gray-100">
                <nav className="flex gap-1 p-1.5" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        relative px-4 py-2 text-sm font-medium rounded-lg transition-all
                        ${activeTab === tab.key
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      {tab.label}
                      {activeTab === tab.key && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-indigo-50 rounded-lg -z-10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Document List */}
              <div className="p-6">
                <DocumentList
                  status={activeTab === 'all' ? undefined : activeTab}
                />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-indigo-600 font-medium animate-pulse">Loading documents...</div>
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
