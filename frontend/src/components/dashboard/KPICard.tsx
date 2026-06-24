"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "emerald" | "amber" | "red";
  trend?: string;
  trendDirection?: "up" | "down";
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon: Icon,
  color = "blue",
  trend,
  trendDirection = "up",
}) => {
  const borderColors = {
    blue: "border-l-4 border-l-blue-500",
    emerald: "border-l-4 border-l-emerald-500",
    amber: "border-l-4 border-l-amber-500",
    red: "border-l-4 border-l-red-500",
  };

  const iconColors = {
    blue: "text-blue-400 bg-blue-600/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-600/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-600/10 border-amber-500/20",
    red: "text-red-400 bg-red-600/10 border-red-500/20",
  };

  return (
    <Card className={`${borderColors[color]} flex items-center justify-between p-6 hoverEffect`}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          {label}
        </span>
        <span className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${
              trendDirection === "up" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trendDirection === "up" ? "▲" : "▼"} {trend}
          </span>
        )}
      </div>

      <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${iconColors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
};
export default KPICard;
