"use client";

import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  children,
  className = "",
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full glass-input text-sm bg-white border-gray-200 text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${
          error ? "border-red-500 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <span className="text-xs text-red-500 mt-0.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
export default Select;
