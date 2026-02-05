'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { format, parseISO, subDays, startOfDay } from 'date-fns';

interface KnowledgeGap {
  id: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
}

interface GapTrendChartProps {
  gaps: KnowledgeGap[];
  days?: number;
}

export default function GapTrendChart({ gaps, days = 14 }: GapTrendChartProps) {
  const chartData = useMemo(() => {
    const data: { date: string; created: number; resolved: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, 'yyyy-MM-dd');

      const created = gaps.filter((gap) => {
        const gapDate = format(new Date(gap.created_at), 'yyyy-MM-dd');
        return gapDate === dateStr;
      }).length;

      const resolved = gaps.filter((gap) => {
        if (!gap.resolved_at) return false;
        const resolvedDate = format(new Date(gap.resolved_at), 'yyyy-MM-dd');
        return resolvedDate === dateStr;
      }).length;

      data.push({ date: dateStr, created, resolved });
    }

    return data;
  }, [gaps, days]);

  const maxCount = useMemo(
    () => Math.max(...chartData.map((d) => Math.max(d.created, d.resolved)), 1),
    [chartData]
  );

  const totalCreated = useMemo(
    () => chartData.reduce((sum, d) => sum + d.created, 0),
    [chartData]
  );

  const totalResolved = useMemo(
    () => chartData.reduce((sum, d) => sum + d.resolved, 0),
    [chartData]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Gap Trend</h3>
            <p className="text-sm text-gray-500">Last {days} days</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">Created ({totalCreated})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-gray-600">Resolved ({totalResolved})</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 flex items-end gap-2">
        {chartData.map((item, index) => (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 justify-center items-end h-24">
              {/* Created bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.created / maxCount) * 100}%` }}
                transition={{ delay: index * 0.02, duration: 0.3 }}
                className="w-2 bg-red-400 rounded-t-sm"
                title={`Created: ${item.created}`}
              />
              {/* Resolved bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(item.resolved / maxCount) * 100}%` }}
                transition={{ delay: index * 0.02 + 0.1, duration: 0.3 }}
                className="w-2 bg-emerald-400 rounded-t-sm"
                title={`Resolved: ${item.resolved}`}
              />
            </div>
            {index % Math.ceil(chartData.length / 7) === 0 && (
              <span className="text-xs text-gray-400">
                {format(parseISO(item.date), 'M/d')}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
