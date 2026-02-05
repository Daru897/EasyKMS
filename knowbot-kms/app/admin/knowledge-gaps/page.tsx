'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import KnowledgeGapList from '@/components/admin/KnowledgeGapList';
import GapTrendChart from '@/components/admin/GapTrendChart';

interface KnowledgeGap {
  id: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
}

function KnowledgeGapsContent() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllGaps = async () => {
      try {
        // Fetch gaps for trend chart
        const response = await fetch('/api/knowledge-gaps?limit=100');
        const data = await response.json();
        if (data.success) {
          setGaps(data.gaps || []);
        }
      } catch (error) {
        console.error('Failed to fetch gaps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllGaps();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-100 rounded-xl">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Gaps</h1>
          <p className="text-gray-600 mt-1">
            Track and resolve queries that couldn&apos;t be answered from the knowledge base
          </p>
        </div>
      </div>

      {/* Trend chart */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <GapTrendChart gaps={gaps} days={14} />
      )}

      {/* Gap list */}
      <KnowledgeGapList />

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-red-50 border border-red-200 rounded-xl p-6"
      >
        <h3 className="font-semibold text-red-900 mb-2">Understanding Knowledge Gaps</h3>
        <ul className="space-y-2 text-sm text-red-800">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
            <span>Gaps are created when agents search for information that isn&apos;t in the knowledge base.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
            <span>Frequent gaps indicate missing documentation that should be created or updated.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
            <span>Mark gaps as resolved once the relevant content has been added to the knowledge base.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0" />
            <span>Resolution notes help track how each gap was addressed.</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export default function KnowledgeGapsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-indigo-600 font-medium animate-pulse">Loading knowledge gaps...</div>
      </div>
    }>
      <KnowledgeGapsContent />
    </Suspense>
  );
}
