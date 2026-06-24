"use client";

import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = "",
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-400">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full glass-input text-sm bg-[#0c0c14] border-white/10 text-slate-100 ${
          error ? "border-red-500/50 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0c0c14] text-slate-200">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-400 mt-0.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
