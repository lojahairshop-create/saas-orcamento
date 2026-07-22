"use client";

import React from "react";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  headers?: React.ReactNode[];
}

export const Table: React.FC<TableProps> = ({ headers, children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className={`w-full border-collapse text-left text-sm text-slate-600 ${className}`} {...props}>
        {headers && (
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {headers.map((h, idx) => (
                <th key={idx} className="px-6 py-3.5 font-semibold text-slate-700 uppercase text-xs tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = "", ...props }) => {
  return (
    <tr className={`hover:bg-gray-50/60 transition-colors duration-150 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = "", ...props }) => {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-slate-600 ${className}`} {...props}>
      {children}
    </td>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = "", ...props }) => (
  <thead className={`bg-gray-50 border-b border-gray-200 ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = "", ...props }) => (
  <tbody className={`divide-y divide-gray-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className = "", ...props }) => (
  <th className={`px-6 py-3.5 font-semibold text-slate-700 uppercase text-xs tracking-wider ${className}`} {...props}>
    {children}
  </th>
);
