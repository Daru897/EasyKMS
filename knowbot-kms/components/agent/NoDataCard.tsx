'use client';

import { motion } from 'framer-motion';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface NoDataCardProps {
  query: string;
  onReportIssue?: () => void;
}

export default function NoDataCard({ query, onReportIssue }: NoDataCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Information Found
          </h3>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t find relevant information in the knowledge base for:
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-gray-700 italic">&quot;{query}&quot;</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Silence Protocol
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Follow your team&apos;s escalation procedure</li>
              <li>• Document the question for knowledge gap review</li>
              <li>• Do not provide unverified information</li>
            </ul>
          </div>

          {onReportIssue && (
            <button
              onClick={onReportIssue}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline"
            >
              Report this as a knowledge gap →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
