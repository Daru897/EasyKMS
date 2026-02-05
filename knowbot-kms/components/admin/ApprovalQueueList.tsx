'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import ApprovalQueueCard from './ApprovalQueueCard';
import QuickApproveActions from './QuickApproveActions';

interface DocumentVersion {
  id: string;
  version_number: number;
  word_count: number | null;
  chunk_count: number | null;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  current_status: string;
  created_at: string;
  updated_at: string;
  current_version: DocumentVersion | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ApprovalQueueList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('status', 'DRAFT');
      params.set('page', page.toString());
      params.set('limit', '20');
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await fetch(`/api/documents?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents);
      setPagination(data.pagination);
      setSelectedIds(new Set()); // Clear selection on fetch
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to approve document');
      }

      // Remove from list
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Approval error:', err);
      throw err;
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/documents/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reject document');
      }

      // Remove from list
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Rejection error:', err);
      throw err;
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(documents.map((doc) => doc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await handleApprove(id);
      } catch (err) {
        console.error(`Failed to approve ${id}:`, err);
      }
    }
    fetchDocuments();
  };

  return (
    <div className="space-y-6">
      {/* Search and actions bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pending documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          onClick={fetchDocuments}
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <QuickApproveActions
          selectedCount={selectedIds.size}
          onApproveAll={handleBulkApprove}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && documents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            All Caught Up!
          </h3>
          <p className="text-gray-500 max-w-sm">
            {debouncedSearch
              ? `No pending documents match "${debouncedSearch}"`
              : 'No documents are waiting for approval'}
          </p>
        </motion.div>
      )}

      {/* Document list */}
      {!loading && !error && documents.length > 0 && (
        <>
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={selectedIds.size === documents.length && documents.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">
              Select all ({documents.length} documents)
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {documents.map((doc, index) => (
                <ApprovalQueueCard
                  key={doc.id}
                  document={doc}
                  index={index}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  selected={selectedIds.has(doc.id)}
                  onSelect={handleSelect}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} documents
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNext}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
