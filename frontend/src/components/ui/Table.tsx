"use client";

import React from "react";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  headers: React.ReactNode[];
}

export const Table: React.FC<TableProps> = ({ headers, children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
      <table className={`w-full border-collapse text-left text-sm text-slate-300 ${className}`} {...props}>
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            {headers.map((h, idx) => (
              <th key={idx} className="px-6 py-4 font-semibold text-slate-200 uppercase text-xs tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = "", ...props }) => {
  return (
    <tr className={`hover:bg-white/[0.02] transition-colors duration-150 ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = "", ...props }) => {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-slate-300 ${className}`} {...props}>
      {children}
    </td>
  );
};
