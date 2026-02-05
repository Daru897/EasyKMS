'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertTriangle } from 'lucide-react';

interface QuickApproveActionsProps {
  selectedCount: number;
  onApproveAll: () => Promise<void>;
  onClearSelection: () => void;
}

export default function QuickApproveActions({
  selectedCount,
  onApproveAll,
  onClearSelection,
}: QuickApproveActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleApproveAll = async () => {
    setIsApproving(true);
    try {
      await onApproveAll();
    } finally {
      setIsApproving(false);
      setShowConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Check className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-indigo-900">
              {selectedCount} document{selectedCount !== 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-indigo-600">
              Ready for bulk action
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearSelection}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear
          </button>

          {showConfirm ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAll}
                disabled={isApproving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Approve All
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve All
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-indigo-200"
          >
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Confirm Bulk Approval
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  You are about to approve {selectedCount} document{selectedCount !== 1 ? 's' : ''}.
                  This will make them available in the knowledge base.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
