'use client';

import { formatDistanceToNow } from 'date-fns';
import { Check, X, Clock, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

interface Approval {
  id: string;
  document_version_id: string;
  action: 'approve' | 'reject';
  comment: string | null;
  created_at: string;
}

interface Version {
  id: string;
  version_number: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_by_user_id: string | null;
}

interface ApprovalHistoryProps {
  versions: Version[];
  approvals: Approval[];
}

export default function ApprovalHistory({ versions, approvals }: ApprovalHistoryProps) {
  // Combine and sort events chronologically
  const events = [
    ...versions.map(v => ({
      type: 'version' as const,
      id: `version-${v.id}`,
      versionId: v.id,
      versionNumber: v.version_number,
      status: v.status,
      timestamp: v.created_at,
      approvedAt: v.approved_at,
    })),
    ...approvals.map(a => ({
      type: 'approval' as const,
      id: `approval-${a.id}`,
      versionId: a.document_version_id,
      action: a.action,
      comment: a.comment,
      timestamp: a.created_at,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No history available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative pl-8 pb-6 last:pb-0"
        >
          {/* Vertical line */}
          {index < events.length - 1 && (
            <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
          )}

          {/* Icon */}
          <div className="absolute left-0 top-0">
            {event.type === 'version' ? (
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
              </div>
            ) : event.action === 'approve' ? (
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-red-600" />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            {event.type === 'version' ? (
              <>
                <p className="text-sm font-medium text-gray-900">
                  Version {event.versionNumber} created
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </p>
                {event.status && (
                  <span className={`
                    inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full
                    ${event.status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
                      event.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'}
                  `}>
                    {event.status}
                  </span>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900">
                  {event.action === 'approve' ? 'Document approved' : 'Changes requested'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </p>
                {event.comment && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100">
                    {event.comment}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
