'use client';

import { motion } from 'framer-motion';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';

interface UsageStatsGridProps {
  totalQueries: number;
  queriesWithAnswers: number;
  queriesNoData: number;
  avgResponseTimeMs: number;
}

export default function UsageStatsGrid({
  totalQueries,
  queriesWithAnswers,
  queriesNoData,
  avgResponseTimeMs,
}: UsageStatsGridProps) {
  const answerRate = totalQueries > 0
    ? Math.round((queriesWithAnswers / totalQueries) * 100)
    : 0;

  const stats = [
    {
      title: 'Total Queries',
      value: totalQueries.toLocaleString(),
      icon: Search,
      color: 'bg-indigo-100 text-indigo-600',
      trend: null,
    },
    {
      title: 'Answer Rate',
      value: `${answerRate}%`,
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-600',
      trend: answerRate >= 80 ? 'good' : answerRate >= 60 ? 'warning' : 'bad',
    },
    {
      title: 'No Answer',
      value: queriesNoData.toLocaleString(),
      icon: XCircle,
      color: 'bg-red-100 text-red-600',
      trend: null,
    },
    {
      title: 'Avg Response',
      value: avgResponseTimeMs < 1000
        ? `${avgResponseTimeMs}ms`
        : `${(avgResponseTimeMs / 1000).toFixed(1)}s`,
      icon: Clock,
      color: 'bg-violet-100 text-violet-600',
      trend: avgResponseTimeMs < 1000 ? 'good' : avgResponseTimeMs < 2000 ? 'warning' : 'bad',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2 rounded-lg ${stat.color.split(' ')[0]}`}>
              <stat.icon className={`w-5 h-5 ${stat.color.split(' ')[1]}`} />
            </div>
            {stat.trend && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  stat.trend === 'good'
                    ? 'bg-emerald-50 text-emerald-700'
                    : stat.trend === 'warning'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {stat.trend === 'good' ? 'Good' : stat.trend === 'warning' ? 'Fair' : 'Needs Work'}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
        </motion.div>
      ))}
    </div>
  );
}
