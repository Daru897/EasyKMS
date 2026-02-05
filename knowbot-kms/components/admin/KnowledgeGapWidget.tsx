'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface GapStats {
  totalGaps: number;
  unresolvedGaps: number;
  resolvedThisWeek: number;
}

interface KnowledgeGapWidgetProps {
  delay?: number;
}

export default function KnowledgeGapWidget({ delay = 0 }: KnowledgeGapWidgetProps) {
  const [stats, setStats] = useState<GapStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/knowledge-gaps?limit=1');
        const data = await response.json();

        if (data.success) {
          setStats({
            totalGaps: data.pagination?.total || 0,
            unresolvedGaps: data.gaps?.filter((g: { is_resolved?: boolean }) => !g.is_resolved).length || 0,
            resolvedThisWeek: data.gaps?.filter((g: { is_resolved?: boolean }) => g.is_resolved).length || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch gap stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </motion.div>
    );
  }

  const hasGaps = stats && stats.unresolvedGaps > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow ${
        hasGaps ? 'border-red-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${hasGaps ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertCircle className={`w-6 h-6 ${hasGaps ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Knowledge Gaps</h3>
            <p className="text-sm text-gray-500">Unanswered queries</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className={`text-3xl font-bold ${hasGaps ? 'text-red-600' : 'text-gray-400'}`}>
            {stats?.unresolvedGaps ?? 0}
          </p>
          <p className="text-sm text-gray-500">unresolved</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-emerald-600">
            {stats?.resolvedThisWeek ?? 0}
          </p>
          <p className="text-sm text-gray-500">resolved</p>
        </div>
      </div>

      <Link
        href="/admin/knowledge-gaps"
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
          hasGaps
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {hasGaps ? 'Review Gaps' : 'View All'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
