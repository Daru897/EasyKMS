'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatus {
  connected: boolean;
  lastSyncAt: string | null;
  filesSynced: number;
  isRunning: boolean;
}

interface SyncStatusWidgetProps {
  tenantId?: string;
  onSyncNow?: () => void;
}

export default function SyncStatusWidget({ tenantId, onSyncNow }: SyncStatusWidgetProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const params = tenantId ? `?tenantId=${tenantId}` : '';
      const response = await fetch(`/api/google-drive/sync${params}`);
      const data = await response.json();

      if (data.success) {
        setStatus({
          connected: data.connected ?? true,
          lastSyncAt: data.lastSyncAt,
          filesSynced: data.filesSynced ?? 0,
          isRunning: data.isRunning ?? false,
        });
      } else {
        setError(data.error || 'Failed to fetch sync status');
      }
    } catch {
      setError('Failed to connect to sync service');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const data = await response.json();

      if (data.success) {
        onSyncNow?.();
        // Refresh status after a short delay
        setTimeout(fetchStatus, 2000);
      } else {
        setError(data.error || 'Failed to trigger sync');
      }
    } catch {
      setError('Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Google Drive Sync</h3>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status?.connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className={`text-sm ${status?.connected ? 'text-emerald-600' : 'text-red-600'}`}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last Sync
          </span>
          <span className="text-gray-900 font-medium">
            {status?.lastSyncAt
              ? formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })
              : 'Never'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Files Synced
          </span>
          <span className="text-gray-900 font-medium">{status?.filesSynced ?? 0}</span>
        </div>
      </div>

      <button
        onClick={handleSyncNow}
        disabled={syncing || status?.isRunning}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {syncing || status?.isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Sync Now
          </>
        )}
      </button>
    </motion.div>
  );
}
