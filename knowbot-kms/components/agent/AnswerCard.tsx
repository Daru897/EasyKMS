'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';

interface AnswerCardProps {
  answer: string;
  confidence: number;
  responseTimeMs?: number;
  maxLength?: number;
}

export default function AnswerCard({
  answer,
  confidence,
  responseTimeMs,
  maxLength = 500,
}: AnswerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = answer.length > maxLength;
  const displayedAnswer = expanded || !isLong ? answer : answer.slice(0, maxLength) + '...';

  // Parse citations [1], [2], etc. and style them
  const formatAnswer = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const citationMatch = part.match(/^\[(\d+)\]$/);
      if (citationMatch) {
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center w-5 h-5 mx-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full cursor-help"
            title={`Source ${citationMatch[1]}`}
          >
            {citationMatch[1]}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-semibold text-gray-900">Answer</h3>
        <div className="flex items-center gap-3">
          {responseTimeMs && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {responseTimeMs < 1000
                ? `${responseTimeMs}ms`
                : `${(responseTimeMs / 1000).toFixed(1)}s`}
            </span>
          )}
          <ConfidenceBadge score={confidence} size="md" />
        </div>
      </div>

      {/* Answer content */}
      <div className="p-6">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {formatAnswer(displayedAnswer)}
          </p>
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
