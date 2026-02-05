'use client';

import { motion, AnimatePresence } from 'framer-motion';
import AnswerCard from './AnswerCard';
import SourcesList from './SourcesList';
import NoDataCard from './NoDataCard';
import LoadingState from './LoadingState';

interface Source {
  document_id: string;
  document_version_id: string;
  document_title: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  effective_date?: string | null;
}

interface QueryResponse {
  type: 'ANSWER' | 'NO_DATA';
  answer?: string;
  confidence: number;
  sources: Source[];
  timings?: {
    totalMs: number;
  };
}

interface SearchResultsProps {
  query: string;
  response: QueryResponse | null;
  isLoading: boolean;
  error: string | null;
  onReportIssue?: () => void;
}

export default function SearchResults({
  query,
  response,
  isLoading,
  error,
  onReportIssue,
}: SearchResultsProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-red-100 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 rounded-xl flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Search Error
            </h3>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Try again →
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={query}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        {response.type === 'ANSWER' && response.answer ? (
          <>
            <AnswerCard
              answer={response.answer}
              confidence={response.confidence}
              responseTimeMs={response.timings?.totalMs}
            />
            <SourcesList sources={response.sources} />
          </>
        ) : (
          <NoDataCard query={query} onReportIssue={onReportIssue} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
