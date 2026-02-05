'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import DocumentCard from './DocumentCard';

type DocumentStatus = 'DRAFT' | 'LIVE' | 'ARCHIVED';

interface Document {
  id: string;
  title: string;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  current_status: DocumentStatus | 'REVIEW';
  google_file_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  current_version: {
    id: string;
    version_number: number;
    word_count: number | null;
    chunk_count: number | null;
    status: string;
    created_at: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DocumentListProps {
  status?: DocumentStatus;
  searchQuery?: string;
}

export default function DocumentList({ status, searchQuery = '' }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', page.toString());
      params.set('limit', '12');
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await fetch(`/api/documents?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [status, page, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Reset page when status changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No documents found
          </h3>
          <p className="text-gray-500 max-w-sm">
            {debouncedSearch
              ? `No documents match "${debouncedSearch}"`
              : status
              ? `No ${status.toLowerCase()} documents yet`
              : 'Documents will appear here once synced from Google Drive'}
          </p>
        </motion.div>
      )}

      {/* Document grid */}
      {!loading && !error && documents.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="wait">
              {documents.map((doc, index) => (
                <DocumentCard key={doc.id} document={doc} index={index} />
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
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrev}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
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
