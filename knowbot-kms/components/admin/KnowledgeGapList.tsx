'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import KnowledgeGapCard from './KnowledgeGapCard';

interface KnowledgeGap {
  id: string;
  query_text: string;
  confidence_score: number | null;
  is_resolved: boolean;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type FilterType = 'all' | 'unresolved' | 'resolved';

export default function KnowledgeGapList() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('unresolved');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filter !== 'all') {
        params.set('isResolved', filter === 'resolved' ? 'true' : 'false');
      }

      const response = await fetch(`/api/knowledge-gaps?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch knowledge gaps');
      }

      setGaps(data.gaps || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge gaps');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filter]);

  useEffect(() => {
    fetchGaps();
  }, [fetchGaps]);

  const handleResolve = async (id: string, resolution: string) => {
    try {
      const response = await fetch(`/api/knowledge-gaps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: true, resolution }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to resolve gap');
      }

      // Update local state
      setGaps((prev) =>
        prev.map((gap) =>
          gap.id === id
            ? { ...gap, is_resolved: true, resolution_notes: resolution, resolved_at: new Date().toISOString() }
            : gap
        )
      );
    } catch (err) {
      console.error('Resolve error:', err);
      throw err;
    }
  };

  const handleUnresolve = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge-gaps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: false }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to unresolve gap');
      }

      // Update local state
      setGaps((prev) =>
        prev.map((gap) =>
          gap.id === id
            ? { ...gap, is_resolved: false, resolution_notes: null, resolved_at: null }
            : gap
        )
      );
    } catch (err) {
      console.error('Unresolve error:', err);
      throw err;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'unresolved', label: 'Unresolved' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge gaps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchGaps}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
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
      {!loading && !error && gaps.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {filter === 'unresolved' ? 'No Unresolved Gaps!' : 'No Knowledge Gaps Found'}
          </h3>
          <p className="text-gray-500 max-w-sm">
            {debouncedSearch
              ? `No knowledge gaps match "${debouncedSearch}"`
              : filter === 'unresolved'
              ? 'All knowledge gaps have been addressed'
              : 'No knowledge gaps recorded yet'}
          </p>
        </motion.div>
      )}

      {/* Gap list */}
      {!loading && !error && gaps.length > 0 && (
        <>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {gaps.map((gap, index) => (
                <KnowledgeGapCard
                  key={gap.id}
                  gap={gap}
                  index={index}
                  onResolve={handleResolve}
                  onUnresolve={handleUnresolve}
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
                {pagination.total} gaps
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
