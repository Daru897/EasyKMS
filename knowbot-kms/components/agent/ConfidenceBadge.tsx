'use client';

import { clsx } from 'clsx';

interface ConfidenceBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

const confidenceConfig: Record<ConfidenceLevel, { label: string; classes: string; dotClass: string }> = {
  high: {
    label: 'High Confidence',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium Confidence',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  low: {
    label: 'Low Confidence',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export default function ConfidenceBadge({
  score,
  size = 'md',
  showLabel = true,
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(score);
  const config = confidenceConfig[level];
  const percentage = Math.round(score * 100);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.classes,
        sizeClasses[size]
      )}
    >
      <span
        className={clsx(
          'rounded-full',
          config.dotClass,
          dotSizes[size]
        )}
      />
      {showLabel ? config.label : `${percentage}%`}
    </span>
  );
}
