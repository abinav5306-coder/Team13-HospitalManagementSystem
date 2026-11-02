import React from 'react';
import { Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Get started by adding a new record',
  onRowClick,
}) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-100 rounded-lg w-full" />
          <div className="h-12 bg-slate-50 rounded-lg w-full" />
          <div className="h-12 bg-slate-50 rounded-lg w-full" />
          <div className="h-12 bg-slate-50 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-xs tracking-wider uppercase">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 font-semibold ${col.className || ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-blue-50/40 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`py-3.5 px-4 ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <p className="text-base font-semibold text-slate-700 font-['Plus_Jakarta_Sans']">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
