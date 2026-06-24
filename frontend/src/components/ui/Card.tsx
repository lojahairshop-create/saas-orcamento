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
      className={`glass-card p-6 ${hoverEffect ? "glass-card-hover" : ""} ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-white/5 pb-4 mb-4 font-semibold text-slate-100 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="text-slate-200">{children}</div>
      {footer && (
        <div className="border-t border-white/5 pt-4 mt-4 text-sm text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
};
