'use client';

import { clsx } from 'clsx';

type DocumentStatus = 'DRAFT' | 'LIVE' | 'ARCHIVED' | 'REVIEW';

interface StatusBadgeProps {
  status: DocumentStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusConfig: Record<DocumentStatus, { label: string; classes: string; dotClass: string }> = {
  DRAFT: {
    label: 'Draft',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  REVIEW: {
    label: 'In Review',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  LIVE: {
    label: 'Live',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  ARCHIVED: {
    label: 'Archived',
    classes: 'bg-gray-50 text-gray-600 border-gray-200',
    dotClass: 'bg-gray-400',
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

export default function StatusBadge({
  status,
  size = 'md',
  showDot = true,
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.classes,
        sizeClasses[size]
      )}
    >
      {showDot && (
        <span
          className={clsx(
            'rounded-full',
            config.dotClass,
            dotSizes[size]
          )}
        />
      )}
      {config.label}
    </span>
  );
}
