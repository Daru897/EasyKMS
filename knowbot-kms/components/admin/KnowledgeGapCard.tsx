'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KnowledgeGap {
  id: string;
  query_text: string;
  confidence_score: number | null;
  is_resolved: boolean;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface KnowledgeGapCardProps {
  gap: KnowledgeGap;
  index: number;
  onResolve: (id: string, resolution: string) => Promise<void>;
  onUnresolve: (id: string) => Promise<void>;
}

export default function KnowledgeGapCard({
  gap,
  index,
  onResolve,
  onUnresolve,
}: KnowledgeGapCardProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const [resolution, setResolution] = useState('');

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolve(gap.id, resolution);
      setShowResolutionInput(false);
      setResolution('');
    } finally {
      setIsResolving(false);
    }
  };

  const handleUnresolve = async () => {
    setIsResolving(true);
    try {
      await onUnresolve(gap.id);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${
        gap.is_resolved ? 'border-emerald-200' : 'border-red-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            gap.is_resolved ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            {gap.is_resolved ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-medium mb-2">&quot;{gap.query_text}&quot;</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(gap.created_at), { addSuffix: true })}
              </span>
              {gap.confidence_score !== null && (
                <span>
                  Confidence: {Math.round(gap.confidence_score * 100)}%
                </span>
              )}
              {gap.is_resolved && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                  Resolved
                </span>
              )}
            </div>

            {gap.resolution_notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Resolution:</p>
                <p className="text-sm text-gray-700">{gap.resolution_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showResolutionInput ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3"
          >
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this gap addressed? (e.g., 'Added to FAQ document')"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-sm"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleResolve}
                disabled={isResolving}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {isResolving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Mark Resolved
              </button>
              <button
                onClick={() => {
                  setShowResolutionInput(false);
                  setResolution('');
                }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            {gap.is_resolved ? (
              <button
                onClick={handleUnresolve}
                disabled={isResolving}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isResolving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Reopen'
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowResolutionInput(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Resolve
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
