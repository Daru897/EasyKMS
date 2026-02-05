'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface QueryTrend {
  date: string;
  count: number;
}

interface QueryVolumeChartProps {
  data: QueryTrend[];
  title?: string;
}

export default function QueryVolumeChart({ data, title = 'Query Volume' }: QueryVolumeChartProps) {
  const { maxCount, chartData } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.count), 1);
    return {
      maxCount: max,
      chartData: data.slice(-30), // Last 30 days
    };
  }, [data]);

  const totalQueries = useMemo(
    () => chartData.reduce((sum, d) => sum + d.count, 0),
    [chartData]
  );

  const avgPerDay = useMemo(
    () => Math.round(totalQueries / (chartData.length || 1)),
    [totalQueries, chartData.length]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Last 30 days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{totalQueries}</p>
          <p className="text-sm text-gray-500">{avgPerDay} avg/day</p>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="h-40 flex items-end gap-1">
        {chartData.map((item, index) => {
          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          return (
            <motion.div
              key={item.date}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              className="flex-1 bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors cursor-pointer group relative"
              title={`${format(parseISO(item.date), 'MMM d')}: ${item.count} queries`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {format(parseISO(item.date), 'MMM d')}: {item.count}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {chartData.length > 0 && (
          <>
            <span>{format(parseISO(chartData[0].date), 'MMM d')}</span>
            <span>{format(parseISO(chartData[chartData.length - 1].date), 'MMM d')}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
