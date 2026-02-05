'use client';

import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ResponseTimeChartProps {
  avgResponseTimeMs: number;
  targetMs?: number;
}

export default function ResponseTimeChart({
  avgResponseTimeMs,
  targetMs = 1000,
}: ResponseTimeChartProps) {
  const percentage = Math.min((avgResponseTimeMs / targetMs) * 100, 150);
  const isGood = avgResponseTimeMs <= targetMs;
  const isWarning = avgResponseTimeMs > targetMs && avgResponseTimeMs <= targetMs * 2;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = () => {
    if (isGood) return 'text-emerald-600';
    if (isWarning) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = () => {
    if (isGood) return 'bg-emerald-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isGood) return 'Excellent';
    if (isWarning) return 'Acceptable';
    return 'Slow';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isGood ? 'bg-emerald-100' : isWarning ? 'bg-amber-100' : 'bg-red-100'}`}>
            <Clock className={`w-5 h-5 ${getStatusColor()}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Response Time</h3>
            <p className="text-sm text-gray-500">Average query response</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          isGood ? 'bg-emerald-50 text-emerald-700' : isWarning ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
        }`}>
          {isGood ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      {/* Main metric */}
      <div className="text-center mb-6">
        <p className={`text-4xl font-bold ${getStatusColor()}`}>
          {formatTime(avgResponseTimeMs)}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Target: {formatTime(targetMs)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${getBarColor()} rounded-full`}
          />
        </div>

        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
          style={{ left: '66.67%' }}
        >
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
            Target
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>0ms</span>
        <span>{formatTime(targetMs * 1.5)}</span>
      </div>

      {/* Performance breakdown */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-emerald-600">70%</p>
          <p className="text-xs text-gray-500">&lt;500ms</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-amber-600">25%</p>
          <p className="text-xs text-gray-500">500ms-1s</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">5%</p>
          <p className="text-xs text-gray-500">&gt;1s</p>
        </div>
      </div>
    </motion.div>
  );
}
