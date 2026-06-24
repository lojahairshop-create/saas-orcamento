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
    { name: "Aprovados", value: aprovados, color: "#10b981" },
    { name: "Pendentes", value: pendentes, color: "#f59e0b" },
    { name: "Reprovados", value: reprovados, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  // Se tudo for zero, mostra um estado vazio circular cinza
  const displayData = data.length > 0 ? data : [{ name: "Sem Dados", value: 1, color: "#334155" }];

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
                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(10,10,15,0.8)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
              itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
              formatter={(value, name) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-semibold text-slate-400 mr-2">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default AprovacaoChart;
