/**
 * Chart UI block component.
 * Renders simple bar, line, or pie charts.
 */
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ChartData } from '@/types';

interface ChartProps {
  data: ChartData;
}

export function Chart({ data }: ChartProps) {
  const maxValue = useMemo(() => Math.max(...data.values, 1), [data.values]);

  // Color palette for bars/segments
  const colors = [
    'bg-primary-500',
    'bg-accent-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
  ];

  if (data.chart_type === 'bar') {
    return (
      <div className="ui-block">
        {data.title && (
          <h4 className="font-semibold text-dark-800 dark:text-dark-100 mb-4">
            {data.title}
          </h4>
        )}
        <div className="space-y-3">
          {data.labels.map((label, index) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-dark-600 dark:text-dark-400 w-24 truncate">
                {label}
              </span>
              <div className="flex-1 h-6 bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.values[index] / maxValue) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`h-full rounded-full ${colors[index % colors.length]}`}
                />
              </div>
              <span className="text-sm font-medium text-dark-700 dark:text-dark-200 w-12 text-right">
                {data.values[index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.chart_type === 'pie') {
    const total = data.values.reduce((sum, val) => sum + val, 0);
    
    return (
      <div className="ui-block">
        {data.title && (
          <h4 className="font-semibold text-dark-800 dark:text-dark-100 mb-4">
            {data.title}
          </h4>
        )}
        <div className="flex flex-wrap gap-3">
          {data.labels.map((label, index) => {
            const percentage = total > 0 ? ((data.values[index] / total) * 100).toFixed(1) : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                <span className="text-sm text-dark-600 dark:text-dark-300">
                  {label}: {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Line chart (simplified visual representation)
  if (data.chart_type === 'line') {
    return (
      <div className="ui-block">
        {data.title && (
          <h4 className="font-semibold text-dark-800 dark:text-dark-100 mb-4">
            {data.title}
          </h4>
        )}
        <div className="flex items-end gap-1 h-32">
          {data.values.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(value / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t"
              />
              <span className="text-xs text-dark-500 truncate max-w-full" title={data.labels[index]}>
                {data.labels[index].slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
