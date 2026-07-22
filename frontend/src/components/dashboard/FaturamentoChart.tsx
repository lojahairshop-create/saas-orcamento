"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FaturamentoChartProps {
  data: Array<{
    mes: string;
    cotado: number;
    aprovado: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
        <p className="text-xs font-semibold text-slate-700 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-xs font-bold"
            style={{ color: entry.color }}
          >
            {entry.name}: R$ {entry.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const FaturamentoChart: React.FC<FaturamentoChartProps> = ({ data }) => {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: -10,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs font-semibold text-slate-500 mr-2">{value}</span>
            )}
          />
          <Bar
            name="Cotado"
            dataKey="cotado"
            fill="#4f9cf7"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
          <Bar
            name="Aprovado"
            dataKey="aprovado"
            fill="#2ec4b6"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
export default FaturamentoChart;
