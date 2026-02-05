'use client';

import { motion } from 'framer-motion';
import { FileText, Clock, Hash, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

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
  current_status: 'DRAFT' | 'LIVE' | 'ARCHIVED' | 'REVIEW';
  google_file_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  current_version: DocumentVersion | null;
}

interface DocumentCardProps {
  document: Document;
  index?: number;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFileIcon(mimeType: string | null, extension: string | null, className: string) {
  // Could extend this to show different icons based on file type
  return <FileText className={className} />;
}

export default function DocumentCard({ document, index = 0 }: DocumentCardProps) {
  const version = document.current_version;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/documents/${document.id}`}>
        <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Icon and title */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                {renderFileIcon(document.mime_type, document.file_extension, 'w-5 h-5 text-indigo-600')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {document.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  {version && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      v{version.version_number}
                    </span>
                  )}
                  {version?.word_count && (
                    <span>{version.word_count.toLocaleString()} words</span>
                  )}
                  <span>{formatFileSize(document.file_size_bytes)}</span>
                </div>
              </div>
            </div>

            {/* Right: Status and time */}
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={document.current_status} size="sm" />
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {document.file_extension && (
                <span className="px-2 py-0.5 bg-gray-100 rounded font-mono uppercase">
                  {document.file_extension}
                </span>
              )}
              {version?.chunk_count ? (
                <span>{version.chunk_count} chunks indexed</span>
              ) : (
                <span className="text-amber-500">Not indexed</span>
              )}
            </div>
            {document.google_file_id && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Google Drive
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
