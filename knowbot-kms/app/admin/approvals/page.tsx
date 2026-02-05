'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare } from 'lucide-react';
import ApprovalQueueList from '@/components/admin/ApprovalQueueList';

function ApprovalsContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-amber-100 rounded-xl">
          <CheckSquare className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-gray-600 mt-1">
            Review and approve documents before they go live in the knowledge base
          </p>
        </div>
      </div>

      {/* Approval list */}
      <ApprovalQueueList />

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-amber-50 border border-amber-200 rounded-xl p-6"
      >
        <h3 className="font-semibold text-amber-900 mb-2">Approval Guidelines</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
            <span>Review content for accuracy, completeness, and policy compliance before approving.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
            <span>Approved documents will be immediately available in agent search results.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
            <span>Rejected documents will be flagged for revision and won&apos;t appear in search.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
            <span>Use bulk approval carefully - ensure all selected documents are verified.</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-indigo-600 font-medium animate-pulse">Loading approvals...</div>
      </div>
    }>
      <ApprovalsContent />
    </Suspense>
  );
}
