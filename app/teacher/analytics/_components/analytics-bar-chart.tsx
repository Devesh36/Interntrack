"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";

interface AnalyticsBarChartProps<T extends Record<string, any>> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  height?: number;
  yAxisWidth?: number;
  xTickFormatter?: (value: string) => string;
  getBarFill?: (entry: T, index: number) => string;
}

export function AnalyticsBarChart<T extends Record<string, any>>({
  data,
  xKey,
  yKey,
  height = 180,
  yAxisWidth = 28,
  xTickFormatter,
  getBarFill,
}: AnalyticsBarChartProps<T>) {
  return (
    <div className="mt-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey={String(xKey)}
            tick={{ fontSize: 13, fill: "#878c97" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 13, fill: "#878c97" }}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey={String(yKey)} radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`${String(xKey)}-${String(entry[xKey])}-${index}`}
                fill={getBarFill ? getBarFill(entry, index) : "#16a34a"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
