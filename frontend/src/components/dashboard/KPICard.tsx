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
    emerald: "border-l-4 border-l-teal-500",
    amber: "border-l-4 border-l-amber-500",
    red: "border-l-4 border-l-red-400",
  };

  const iconColors = {
    blue: "text-teal-500 bg-blue-50 border-blue-100",
    emerald: "text-teal-500 bg-teal-50 border-teal-100",
    amber: "text-amber-500 bg-amber-50 border-amber-100",
    red: "text-red-500 bg-red-50 border-red-100",
  };

  return (
    <Card className={`${borderColors[color]} flex items-center justify-between p-6`} hoverEffect>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          {label}
        </span>
        <span className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${
              trendDirection === "up" ? "text-teal-500" : "text-red-400"
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