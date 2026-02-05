'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, Calendar } from 'lucide-react';
import UsageStatsGrid from '@/components/admin/UsageStatsGrid';
import QueryVolumeChart from '@/components/admin/QueryVolumeChart';
import TopQueriesTable from '@/components/admin/TopQueriesTable';
import ResponseTimeChart from '@/components/admin/ResponseTimeChart';

interface UsageStats {
  totalQueries: number;
  queriesWithAnswers: number;
  queriesNoData: number;
  avgResponseTimeMs: number;
  topQueries: { query: string; count: number }[];
}

interface TrendPoint {
  date: string;
  value: number;
}

interface InsightData {
  topNoDataQueries: { query: string; count: number }[];
  topAnsweredQueries: { query: string; count: number }[];
  trendingUpQueries: { query: string; delta: number }[];
  topCategories: { category: string; count: number }[];
}

function AnalyticsContent() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [channel, setChannel] = useState('all');
  const [responseType, setResponseType] = useState('all');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          days: String(days),
          channel,
          responseType,
        });
        if (category.trim().length > 0) {
          queryParams.set('category', category.trim());
        }

        const [reportsResponse, trendsResponse, insightsResponse] = await Promise.all([
          fetch(`/api/analytics/reports?${queryParams.toString()}`),
          fetch(`/api/analytics/trends?metric=queries&${queryParams.toString()}`),
          fetch(`/api/analytics/insights?${queryParams.toString()}`),
        ]);

        const reportsData = await reportsResponse.json();
        const trendsData = await trendsResponse.json();
        const insightsData = await insightsResponse.json();

        if (!reportsData.success) {
          throw new Error(reportsData.error || 'Failed to fetch analytics');
        }
        if (!trendsData.success) {
          throw new Error(trendsData.error || 'Failed to fetch trends');
        }
        if (!insightsData.success) {
          throw new Error(insightsData.error || 'Failed to fetch insights');
        }

        setStats(reportsData);
        setTrend(trendsData.trend || []);
        setInsights(insightsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [days, channel, responseType, category]);

  const dateRanges = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-gray-600 mt-1">
              Monitor search activity and system performance
            </p>
          </div>
        </div>

        {/* Date range selector */}
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
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats content */}
      {!loading && !error && stats && (
        <>
          {/* Stats grid */}
          <UsageStatsGrid
            totalQueries={stats.totalQueries}
            queriesWithAnswers={stats.queriesWithAnswers}
            queriesNoData={stats.queriesNoData}
            avgResponseTimeMs={stats.avgResponseTimeMs}
          />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueryVolumeChart data={trend.map((point) => ({ date: point.date, count: point.value }))} />
            <ResponseTimeChart avgResponseTimeMs={stats.avgResponseTimeMs} />
          </div>

          {/* Top queries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopQueriesTable queries={stats.topQueries} />

            {/* Quick insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Insights</h3>
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-medium text-indigo-900">Query Volume</p>
                  <p className="text-sm text-indigo-700 mt-1">
                    {stats.totalQueries > 0
                      ? `${Math.round(stats.totalQueries / days)} queries per day average`
                      : 'No queries recorded in this period'}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900">Answer Rate</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    {stats.totalQueries > 0
                      ? `${Math.round((stats.queriesWithAnswers / stats.totalQueries) * 100)}% of queries received an answer`
                      : 'No data available'}
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-900">Knowledge Gaps</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {stats.queriesNoData > 0
                      ? `${stats.queriesNoData} queries couldn't be answered - consider adding content`
                      : 'No knowledge gaps recorded'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Knowledge Gaps</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {insights.topNoDataQueries.length === 0 && <li>No gaps detected.</li>}
                  {insights.topNoDataQueries.map((item) => (
                    <li key={item.query} className="flex items-center justify-between">
                      <span className="truncate">{item.query}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Trending Up</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {insights.trendingUpQueries.length === 0 && <li>No upward trends.</li>}
                  {insights.trendingUpQueries.map((item) => (
                    <li key={item.query} className="flex items-center justify-between">
                      <span className="truncate">{item.query}</span>
                      <span className="text-emerald-600">+{item.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Answered Queries</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {insights.topAnsweredQueries.length === 0 && <li>No answered queries yet.</li>}
                  {insights.topAnsweredQueries.map((item) => (
                    <li key={item.query} className="flex items-center justify-between">
                      <span className="truncate">{item.query}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Categories</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {insights.topCategories.length === 0 && <li>No category data.</li>}
                  {insights.topCategories.map((item) => (
                    <li key={item.category} className="flex items-center justify-between">
                      <span className="truncate">{item.category}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Info section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-6"
      >
        <h3 className="font-semibold text-blue-900 mb-2">About Analytics</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Analytics are updated in real-time as agents use the search feature.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Top queries help identify the most common information needs.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Response time metrics help monitor system performance.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <span>Use the date range selector to analyze different time periods.</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-indigo-600 font-medium animate-pulse">Loading analytics...</div>
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
