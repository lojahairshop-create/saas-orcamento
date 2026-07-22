"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  header,
  footer,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-sm p-6 transition-all duration-200 ${hoverEffect ? "hover:shadow-md hover:-translate-y-0.5" : ""} ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-gray-100 pb-4 mb-4 font-semibold text-slate-800 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="text-slate-600">{children}</div>
      {footer && (
        <div className="border-t border-gray-100 pt-4 mt-4 text-sm text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
};
