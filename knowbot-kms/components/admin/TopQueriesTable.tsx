'use client';

import { motion } from 'framer-motion';
import { Search, TrendingUp } from 'lucide-react';

interface TopQuery {
  query: string;
  count: number;
}

interface TopQueriesTableProps {
  queries: TopQuery[];
  maxQueries?: number;
}

export default function TopQueriesTable({ queries, maxQueries = 10 }: TopQueriesTableProps) {
  const topQueries = queries.slice(0, maxQueries);
  const maxCount = Math.max(...topQueries.map((q) => q.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Top Queries</h3>
        </div>
        <span className="text-sm text-gray-500">{topQueries.length} queries</span>
      </div>

      {topQueries.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No query data available</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {topQueries.map((query, index) => {
            const width = (query.count / maxCount) * 100;
            return (
              <motion.div
                key={query.query}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-50 transition-all"
                  style={{ width: `${width}%` }}
                />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 truncate" title={query.query}>
                      {query.query}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 flex-shrink-0">
                    {query.count}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
