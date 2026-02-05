'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Check, X, Eye, Loader2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface DocumentVersion {
  id: string;
  version_number: number;
  word_count: number | null;
  chunk_count: number | null;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  current_status: string;
  created_at: string;
  updated_at: string;
  current_version: DocumentVersion | null;
}

interface ApprovalQueueCardProps {
  document: Document;
  index: number;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export default function ApprovalQueueCard({
  document,
  index,
  onApprove,
  onReject,
  selected = false,
  onSelect,
}: ApprovalQueueCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(document.id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await onReject(document.id, rejectReason);
    } finally {
      setIsRejecting(false);
      setShowRejectInput(false);
      setRejectReason('');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${
        selected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(document.id, e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          )}

          <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/documents/${document.id}`}
                  className="font-medium text-gray-900 hover:text-indigo-600 truncate block"
                >
                  {document.title}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                  </span>
                  <span>{formatFileSize(document.file_size_bytes)}</span>
                  {document.current_version?.word_count && (
                    <span>{document.current_version.word_count} words</span>
                  )}
                </div>
              </div>

              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium flex-shrink-0">
                Draft
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {showRejectInput ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-3"
          >
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none text-sm"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {isRejecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Confirm Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={() => setShowRejectInput(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <Link
              href={`/documents/${document.id}`}
              className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
