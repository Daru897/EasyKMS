'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';

interface DocumentViewerProps {
  content: string;
  className?: string;
}

export default function DocumentViewer({ content, className }: DocumentViewerProps) {
  const processedContent = useMemo(() => {
    if (!content) return '';
    return content;
  }, [content]);

  if (!content || content.trim().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
        <p>No content available</p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'prose prose-gray max-w-none',
        // Headings
        'prose-headings:font-semibold prose-headings:text-gray-900',
        'prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:border-gray-200',
        'prose-h2:text-xl prose-h2:mt-8',
        'prose-h3:text-lg prose-h3:mt-6',
        // Paragraphs
        'prose-p:text-gray-700 prose-p:leading-relaxed',
        // Lists
        'prose-ul:my-4 prose-ol:my-4',
        'prose-li:text-gray-700 prose-li:my-1',
        // Links
        'prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline',
        // Code
        'prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-gray-800',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:overflow-x-auto',
        // Tables
        'prose-table:border-collapse prose-table:w-full',
        'prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-gray-200',
        'prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-200',
        // Blockquotes
        'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:not-italic prose-blockquote:py-2',
        // Strong/Bold
        'prose-strong:font-semibold prose-strong:text-gray-900',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
