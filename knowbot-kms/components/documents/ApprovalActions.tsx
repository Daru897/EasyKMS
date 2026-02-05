'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, MessageSquare } from 'lucide-react';

interface ApprovalActionsProps {
  documentId: string;
  status: 'DRAFT' | 'LIVE' | 'ARCHIVED' | 'REVIEW';
  onApproved?: () => void;
  onRejected?: () => void;
}

export default function ApprovalActions({
  documentId,
  status,
  onApproved,
  onRejected,
}: ApprovalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [showApproveComment, setShowApproveComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show actions for DRAFT documents
  if (status !== 'DRAFT') {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600 text-sm">
        {status === 'LIVE' && 'This document is already live.'}
        {status === 'ARCHIVED' && 'This document has been archived.'}
        {status === 'REVIEW' && 'This document is under review.'}
      </div>
    );
  }

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: approveComment }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to approve document');
      }

      setShowApproveComment(false);
      setApproveComment('');
      onApproved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setIsRejecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reject document');
      }

      setShowRejectModal(false);
      setRejectReason('');
      onRejected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve section */}
      <div className="space-y-3">
        {showApproveComment ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add approval comment (optional)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirm Approval
              </button>
              <button
                onClick={() => {
                  setShowApproveComment(false);
                  setApproveComment('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowApproveComment(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm"
          >
            <Check className="w-5 h-5" />
            Approve Document
          </button>
        )}
      </div>

      {/* Reject button */}
      {!showApproveComment && (
        <button
          onClick={() => setShowRejectModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
        >
          <X className="w-5 h-5" />
          Request Changes
        </button>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Request Changes</h3>
                  <p className="text-sm text-gray-500">Provide feedback for the author</p>
                </div>
              </div>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain what changes are needed..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                rows={4}
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRejecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Submit Feedback
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
