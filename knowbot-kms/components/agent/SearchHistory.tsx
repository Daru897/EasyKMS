'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, ChevronUp, Clock, Search } from 'lucide-react';

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  hadAnswer: boolean;
}

interface SearchHistoryProps {
  onSelectQuery: (query: string) => void;
  maxItems?: number;
}

const STORAGE_KEY = 'agent_search_history';

export function addToSearchHistory(query: string, hadAnswer: boolean) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const history: SearchHistoryItem[] = stored ? JSON.parse(stored) : [];

    // Remove duplicate if exists
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());

    // Add new item at the beginning
    filtered.unshift({
      query,
      timestamp: Date.now(),
      hadAnswer,
    });

    // Keep only last 20 items
    const trimmed = filtered.slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('search-history-updated'));
    }
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('search-history-updated'));
    }
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}

export default function SearchHistory({ onSelectQuery, maxItems = 5 }: SearchHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load search history:', error);
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refreshHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setHistory(stored ? JSON.parse(stored) : []);
      } catch (error) {
        console.error('Failed to refresh search history:', error);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        refreshHistory();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('search-history-updated', refreshHistory);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('search-history-updated', refreshHistory);
    };
  }, []);

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Don't render anything on server or if no history
  if (typeof window === 'undefined' || history.length === 0) {
    return null;
  }

  const visibleItems = expanded ? history : history.slice(0, maxItems);
  const hasMore = history.length > maxItems;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-600">
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">Recent Searches</span>
        </div>
        <button
          onClick={handleClearHistory}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* History list */}
      <div className="divide-y divide-gray-50">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <motion.button
              key={item.timestamp}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectQuery(item.query)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left group"
            >
              <Search className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate group-hover:text-indigo-600">
                  {item.query}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!item.hadAnswer && (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-xs rounded">
                    No answer
                  </span>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(item.timestamp)}
                </span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-100"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show {history.length - maxItems} more <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}
