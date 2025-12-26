/**
 * Info card UI block component.
 */
'use client';

import type { InfoCardData } from '@/types';

interface InfoCardProps {
  data: InfoCardData;
}

export function InfoCard({ data }: InfoCardProps) {
  return (
    <div className="ui-block">
      <div className="flex items-start gap-3">
        {data.icon && (
          <span className="text-2xl flex-shrink-0">{data.icon}</span>
        )}
        <div>
          <h3 className="font-semibold text-dark-900 dark:text-dark-100 mb-1">
            {data.title}
          </h3>
          <p className="text-sm text-dark-600 dark:text-dark-300">
            {data.content}
          </p>
        </div>
      </div>
    </div>
  );
}
