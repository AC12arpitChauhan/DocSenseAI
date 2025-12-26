/**
 * Data table UI block component.
 */
'use client';

import type { TableData } from '@/types';

interface DataTableProps {
  data: TableData;
}

export function DataTable({ data }: DataTableProps) {
  return (
    <div className="ui-block overflow-hidden">
      {data.caption && (
        <p className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-3">
          {data.caption}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-200 dark:border-dark-600">
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-left font-semibold text-dark-700 dark:text-dark-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-dark-100 dark:border-dark-700 last:border-0
                         hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-2 text-dark-600 dark:text-dark-300"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
