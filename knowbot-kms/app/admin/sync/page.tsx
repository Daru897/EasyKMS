'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import SyncStatusWidget from '@/components/admin/SyncStatusWidget';
import SyncLogTable from '@/components/admin/SyncLogTable';

function SyncStatusContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <RefreshCw className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sync Status</h1>
          <p className="text-gray-600 mt-1">
            Monitor Google Drive synchronization and file processing
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sync status widget */}
        <div className="lg:col-span-1">
          <SyncStatusWidget />
        </div>

        {/* Sync logs */}
        <div className="lg:col-span-2">
          <SyncLogTable limit={15} />
        </div>
      </div>

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">About Sync</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Files are automatically synced from your connected Google Drive folder every 15 minutes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>New files are processed and indexed for search after sync completes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Click &quot;Sync Now&quot; to manually trigger an immediate sync.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Documents start as &quot;Draft&quot; status and require approval before becoming searchable.</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export default function SyncStatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-indigo-600 font-medium animate-pulse">Loading sync status...</div>
      </div>
    }>
      <SyncStatusContent />
    </Suspense>
  );
}
