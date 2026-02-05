'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalQueueStats {
  pendingCount: number;
  oldestPendingAt: string | null;
}

interface ApprovalQueueWidgetProps {
  delay?: number;
}

export default function ApprovalQueueWidget({ delay = 0 }: ApprovalQueueWidgetProps) {
  const [stats, setStats] = useState<ApprovalQueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/documents?status=DRAFT&limit=1');
        const data = await response.json();

        if (data.success) {
          setStats({
            pendingCount: data.pagination?.total || 0,
            oldestPendingAt: data.documents?.[0]?.created_at || null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch approval stats:', error);
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

  const hasPending = stats && stats.pendingCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow ${
        hasPending ? 'border-amber-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${hasPending ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <CheckSquare className={`w-6 h-6 ${hasPending ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Approval Queue</h3>
            <p className="text-sm text-gray-500">Documents pending review</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className={`text-4xl font-bold ${hasPending ? 'text-amber-600' : 'text-gray-400'}`}>
            {stats?.pendingCount ?? 0}
          </p>
          <p className="text-sm text-gray-500">pending</p>
        </div>

        {stats?.oldestPendingAt && (
          <div className="text-right">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Oldest
            </p>
            <p className="text-sm font-medium text-gray-700">
              {formatDistanceToNow(new Date(stats.oldestPendingAt), { addSuffix: true })}
            </p>
          </div>
        )}
      </div>

      <Link
        href="/admin/approvals"
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
          hasPending
            ? 'bg-amber-600 text-white hover:bg-amber-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {hasPending ? 'Review Queue' : 'View Queue'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
