'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, X, Command } from 'lucide-react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  initialValue?: string;
}

export default function SearchInput({
  onSearch,
  isLoading = false,
  placeholder = 'Ask a question...',
  initialValue = '',
}: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery && !isLoading) {
      onSearch(trimmedQuery);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="relative flex items-center">
        <div className="absolute left-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full h-14 pl-12 pr-32 bg-white border border-gray-200 rounded-2xl text-lg
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-400 transition-all shadow-sm hover:shadow-md"
        />

        <div className="absolute right-3 flex items-center gap-2">
          {query && !isLoading && (
            <button
              onClick={clearQuery}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors
              flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-sm text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> to search
      </p>
    </motion.div>
  );
}
