"use client";

import React from "react";

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normStatus = status.toLowerCase();

  const config: Record<string, { bg: string; text: string; label: string }> = {
    rascunho: {
      bg: "bg-slate-500/10 border-slate-500/20",
      text: "text-slate-400",
      label: "Rascunho",
    },
    pendente: {
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-400",
      label: "Pendente",
    },
    aprovado: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
      label: "Aprovado",
    },
    reprovado: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      label: "Reprovado",
    },
    cancelado: {
      bg: "bg-slate-800/50 border-slate-700/30",
      text: "text-slate-500",
      label: "Cancelado",
    },
  };

  const item = config[normStatus] || {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-400",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.bg} ${item.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {item.label}
    </span>
  );
};
