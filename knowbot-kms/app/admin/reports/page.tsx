'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';

type ExportFormat = 'csv' | 'json';

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [channel, setChannel] = useState('all');
  const [responseType, setResponseType] = useState('all');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateRanges = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
  ];

  const buildQueryParams = (format: ExportFormat) => {
    const queryParams = new URLSearchParams({
      days: String(days),
      format,
      channel,
      responseType,
    });
    if (category.trim().length > 0) {
      queryParams.set('category', category.trim());
    }
    return queryParams.toString();
  };

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setError(null);
    try {
      const response = await fetch(`/api/analytics/exports?${buildQueryParams(format)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to export data');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${days}d.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const payload = await response.json();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${days}d.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Export analytics data for audits, insights, and stakeholder reporting.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setDays(range.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  days === range.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {range.label}
              </button>
            ))}
          </div>

          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="all">All Channels</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="api">API</option>
          </select>

          <select
            value={responseType}
            onChange={(e) => setResponseType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          >
            <option value="all">All Responses</option>
            <option value="ANSWER">Answered</option>
            <option value="NO_DATA">No Data</option>
          </select>

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category filter"
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {loading === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export JSON
          </button>
        </div>
      </div>
    </motion.div>
  );
}
