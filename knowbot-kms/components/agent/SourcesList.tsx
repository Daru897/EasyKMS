'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';

interface Source {
  document_id: string;
  document_version_id: string;
  document_title: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  effective_date?: string | null;
}

interface SourcesListProps {
  sources: Source[];
  maxVisible?: number;
}

export default function SourcesList({ sources, maxVisible = 3 }: SourcesListProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  if (!sources || sources.length === 0) {
    return null;
  }

  const visibleSources = expanded ? sources : sources.slice(0, maxVisible);
  const hasMore = sources.length > maxVisible;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Sources ({sources.length})
        </h4>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleSources.map((source, index) => (
            <motion.div
              key={`${source.document_version_id}-${source.chunk_index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSource(expandedSource === index ? null : index)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {source.document_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        Chunk {source.chunk_index + 1}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {Math.round(source.score * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                    expandedSource === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {expandedSource === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-0">
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                          {source.chunk_text}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          {source.effective_date && (
                            <span className="text-xs text-gray-500">
                              Effective: {new Date(source.effective_date).toLocaleDateString()}
                            </span>
                          )}
                          <a
                            href={`/documents/${source.document_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            View document <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
