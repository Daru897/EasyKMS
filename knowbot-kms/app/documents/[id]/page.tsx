'use client';

import { useState, useEffect, useCallback, Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Clock,
  Hash,
  ExternalLink,
  Loader2,
  RefreshCw,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import StatusBadge from '@/components/documents/StatusBadge';
import DocumentViewer from '@/components/documents/DocumentViewer';
import ApprovalActions from '@/components/documents/ApprovalActions';
import ApprovalHistory from '@/components/documents/ApprovalHistory';

interface DocumentVersion {
  id: string;
  version_number: number;
  parsed_markdown: string | null;
  word_count: number | null;
  chunk_count: number | null;
  status: string;
  pii_redacted: boolean;
  pii_redaction_stats: Record<string, number> | null;
  parser_metadata: Record<string, unknown> | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
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
  google_drive_metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  current_version: DocumentVersion | null;
  categories: string[];
  versions: Array<{
    id: string;
    version_number: number;
    status: string;
    created_at: string;
    approved_at: string | null;
    approved_by_user_id: string | null;
  }>;
  approvals: Array<{
    id: string;
    document_version_id: string;
    action: 'approve' | 'reject';
    comment: string | null;
    created_at: string;
  }>;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch document');
      }

      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchDocument();
    }
  }, [user, fetchDocument]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full p-8 bg-white rounded-2xl shadow-xl"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            {/* Back button */}
            <button
              onClick={() => router.push('/documents')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documents
            </button>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Error loading document</span>
                </div>
                <p>{error}</p>
                <button
                  onClick={fetchDocument}
                  className="mt-4 flex items-center gap-2 text-red-700 hover:text-red-900"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            )}

            {/* Document content */}
            {!loading && !error && document && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Document header */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-2xl font-bold text-gray-900 truncate">
                            {document.title}
                          </h1>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            {document.current_version && (
                              <span className="flex items-center gap-1">
                                <Hash className="w-4 h-4" />
                                Version {document.current_version.version_number}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Updated {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={document.current_status} size="lg" />
                    </div>

                    {/* Categories */}
                    {document.categories.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-4 h-4 text-gray-400" />
                        {document.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* PII warning */}
                    {document.current_version?.pii_redacted && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          This document has been processed for PII. Some personal information may have been redacted.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Document content */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
                    <DocumentViewer
                      content={document.current_version?.parsed_markdown || ''}
                    />
                  </div>
                </div>

                {/* Sidebar (1/3) */}
                <div className="space-y-6">
                  {/* Approval actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                    <ApprovalActions
                      documentId={document.id}
                      status={document.current_status}
                      onApproved={fetchDocument}
                      onRejected={fetchDocument}
                    />
                  </div>

                  {/* Document metadata */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">File Type</dt>
                        <dd className="font-medium text-gray-900 uppercase">
                          {document.file_extension || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">File Size</dt>
                        <dd className="font-medium text-gray-900">
                          {formatFileSize(document.file_size_bytes)}
                        </dd>
                      </div>
                      {document.current_version?.word_count && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Word Count</dt>
                          <dd className="font-medium text-gray-900">
                            {document.current_version.word_count.toLocaleString()}
                          </dd>
                        </div>
                      )}
                      {document.current_version?.chunk_count ? (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Chunks Indexed</dt>
                          <dd className="font-medium text-emerald-600">
                            {document.current_version.chunk_count}
                          </dd>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Indexing Status</dt>
                          <dd className="font-medium text-amber-600">Not indexed</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Created</dt>
                        <dd className="font-medium text-gray-900">
                          {format(new Date(document.created_at), 'MMM d, yyyy')}
                        </dd>
                      </div>
                      {document.google_file_id && (
                        <div className="pt-2 border-t border-gray-100">
                          <a
                            href={`https://drive.google.com/file/d/${document.google_file_id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View in Google Drive
                          </a>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Approval history */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
                    <ApprovalHistory
                      versions={document.versions}
                      approvals={document.approvals}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-indigo-600 font-medium animate-pulse">Loading document...</div>
      </div>
    }>
      <DocumentDetailContent params={params} />
    </Suspense>
  );
}
