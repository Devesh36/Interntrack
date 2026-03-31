"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartTooltip, NoChartData } from "./chart-tooltip";
import { COLORS, PALETTE } from "../_lib/constants";
import type { FilteredData } from "../_lib/types";

interface TrendsChartsProps {
  filteredData: FilteredData;
}

export function TrendsCharts({ filteredData }: TrendsChartsProps) {
  const durationBarData = useMemo(() => {
    return filteredData.durationAnalytics.distribution.map((d) => ({
      range: d.range.replace(" weeks", " wks"),
      count: d.count,
    }));
  }, [filteredData.durationAnalytics]);

  const durationBarColors = [
    COLORS.amber,
    COLORS.blue,
    COLORS.green,
    COLORS.violet,
  ];

  const domainTrendColors = [
    COLORS.blue,
    COLORS.green,
    COLORS.amber,
    COLORS.violet,
    COLORS.pink,
    COLORS.cyan,
  ];

  const hasYearData = filteredData.yearAnalytics.length > 0;
  const hasDurationData = durationBarData.some((item) => item.count > 0);
  const hasDomainTrendData =
    filteredData.domainTrends.length > 0 &&
    filteredData.domainTrendKeys.length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Year-over-Year Trend */}
        <div className="lg:col-span-3 bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="mb-1">
            <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
              Year-over-Year Trend
            </div>
            <div className="text-sm text-[#878c97] mt-0.5">
              Total internships placed each academic year
            </div>
          </div>
          {hasYearData ? (
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData.yearAnalytics}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.blue}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.blue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.blue}
                    fill="url(#colorCount)"
                    strokeWidth={2.5}
                    dot={{
                      fill: "#fff",
                      stroke: COLORS.blue,
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{ r: 5, fill: COLORS.blue }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoChartData message="No year-wise data available for the current filters" />
          )}
        </div>

        {/* Duration Distribution */}
        <div className="lg:col-span-2 bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="mb-1">
            <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
              Duration Distribution
            </div>
            <div className="text-sm text-[#878c97] mt-0.5">
              Internship length in weeks
            </div>
          </div>
          {hasDurationData ? (
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationBarData}>
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {durationBarData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={durationBarColors[i % durationBarColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <NoChartData message="No duration data available for the current filters" />
          )}
        </div>
      </div>

      {/* Domain Trends over Time */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Domain Trends
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            How top internship domains have trended across academic years
          </div>
        </div>
        {hasDomainTrendData ? (
          <div className="h-[260px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData.domainTrends}>
                <defs>
                  {filteredData.domainTrendKeys.map((domain, i) => (
                    <linearGradient
                      key={domain}
                      id={`domainGrad-${i}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={
                          domainTrendColors[i % domainTrendColors.length]
                        }
                        stopOpacity={0.12}
                      />
                      <stop
                        offset="95%"
                        stopColor={
                          domainTrendColors[i % domainTrendColors.length]
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 13 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 13 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                />
                {filteredData.domainTrendKeys.map((domain, i) => (
                  <Area
                    key={domain}
                    type="monotone"
                    dataKey={domain}
                    name={domain}
                    stroke={domainTrendColors[i % domainTrendColors.length]}
                    fill={`url(#domainGrad-${i})`}
                    strokeWidth={2}
                    dot={{
                      fill: "#fff",
                      stroke: domainTrendColors[i % domainTrendColors.length],
                      strokeWidth: 2,
                      r: 3,
                    }}
                    activeDot={{
                      r: 5,
                      fill: domainTrendColors[i % domainTrendColors.length],
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoChartData message="No domain trend data available for the current filters" />
        )}
      </div>
    </div>
  );
}
