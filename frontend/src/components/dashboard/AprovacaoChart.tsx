"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AprovacaoChartProps {
  aprovados: number;
  pendentes: number;
  reprovados: number;
}

export const AprovacaoChart: React.FC<AprovacaoChartProps> = ({
  aprovados,
  pendentes,
  reprovados,
}) => {
  const data = [
    { name: "Aprovados", value: aprovados, color: "#2ec4b6" },
    { name: "Pendentes", value: pendentes, color: "#f59e0b" },
    { name: "Reprovados", value: reprovados, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const displayData = data.length > 0 ? data : [{ name: "Sem Dados", value: 1, color: "#d1d5db" }];

  return (
    <div className="w-full h-80 flex flex-col justify-center items-center">
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              itemStyle={{ fontSize: "12px", fontWeight: "bold", color: "#1a1d26" }}
              formatter={(value, name) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-semibold text-slate-500 mr-2">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default AprovacaoChart;
