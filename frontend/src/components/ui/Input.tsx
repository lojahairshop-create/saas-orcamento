"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = "",
  type = "text",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-400">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-500 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full glass-input text-sm ${icon ? "pl-10" : "pl-3"} ${
            error ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-red-400 mt-0.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
