"use client";

import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children, className = "", ...props }) => {
  if (status) {
    const normStatus = status.toLowerCase();

    const config: Record<string, { bg: string; text: string; label: string }> = {
      rascunho: {
        bg: "bg-gray-100 border-gray-200",
        text: "text-slate-600",
        label: "Rascunho",
      },
      pendente: {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        label: "Pendente",
      },
      aprovado: {
        bg: "bg-teal-50 border-teal-200",
        text: "text-teal-700",
        label: "Aprovado",
      },
      reprovado: {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
        label: "Reprovado",
      },
      cancelado: {
        bg: "bg-gray-200 border-gray-300",
        text: "text-slate-500",
        label: "Cancelado",
      },
    };

    const item = config[normStatus] || {
      bg: "bg-teal-50 border-teal-200",
      text: "text-teal-700",
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.bg} ${item.text} ${className}`}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
        {item.label}
      </span>
    );
  }

  const variants = {
    default: "bg-gray-100 text-slate-700 border-gray-200",
    success: "bg-teal-50 text-teal-700 border-teal-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant || "default"]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
export default Badge;
