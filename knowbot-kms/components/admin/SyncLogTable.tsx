'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Check, X, Clock, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface SyncLogEntry {
  id: string;
  file_name: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  synced_at: string;
}

interface SyncLogTableProps {
  tenantId?: string;
  limit?: number;
}

export default function SyncLogTable({ tenantId, limit = 10 }: SyncLogTableProps) {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', tenantId);
      params.set('limit', limit.toString());

      const response = await fetch(`/api/google-drive/sync/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to fetch sync logs');
      }
    } catch {
      setError('Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  }, [tenantId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Sync Activity</h3>
        <button
          onClick={fetchLogs}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No sync activity yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-lg">
                {getStatusIcon(log.status)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {log.file_name}
                </p>
                {log.message && (
                  <p className="text-xs text-gray-500 truncate">{log.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(
                    log.status
                  )}`}
                >
                  {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                </span>
                <span className="text-xs text-gray-500" title={format(new Date(log.synced_at), 'PPpp')}>
                  {formatDistanceToNow(new Date(log.synced_at), { addSuffix: true })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
