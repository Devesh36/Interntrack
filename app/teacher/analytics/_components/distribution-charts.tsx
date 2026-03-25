"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChartTooltip,
  PieTooltip,
  ChartLegend,
  NoChartData,
} from "./chart-tooltip";
import { AnalyticsBarChart } from "./analytics-bar-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BRANCH_COLORS,
  COLORS,
  STIPEND_COLORS,
  MODE_COLORS,
  PALETTE,
} from "../_lib/constants";
import type { FilteredData } from "../_lib/types";

interface DistributionChartsProps {
  filteredData: FilteredData;
}

export function DistributionCharts({ filteredData }: DistributionChartsProps) {
  const [selectedTimelineYear, setSelectedTimelineYear] = useState("");

  const companyDonutData = useMemo(() => {
    const top5 = filteredData.companyDistribution.slice(0, 5);
    const othersCount = filteredData.companyDistribution
      .slice(5)
      .reduce((sum, c) => sum + c.count, 0);
    const result = top5.map((c) => ({ name: c.company, value: c.count }));
    if (othersCount > 0) result.push({ name: "Others", value: othersCount });
    return result;
  }, [filteredData.companyDistribution]);

  const companyDonutColors = [
    COLORS.blue,
    COLORS.green,
    COLORS.violet,
    COLORS.amber,
    COLORS.cyan,
    "#e5e7eb",
  ];

  const stipendChartData = useMemo(() => {
    return [
      { name: "Paid", value: filteredData.stipendAnalytics.paid },
      { name: "Unpaid", value: filteredData.stipendAnalytics.unpaid },
      { name: "Unknown", value: filteredData.stipendAnalytics.unknown },
    ].filter((d) => d.value > 0);
  }, [filteredData.stipendAnalytics]);

  const modeChartData = useMemo(() => {
    return [
      { mode: "Online", count: filteredData.modeAnalytics.online },
      { mode: "Offline", count: filteredData.modeAnalytics.offline },
      { mode: "Hybrid", count: filteredData.modeAnalytics.hybrid },
      { mode: "Unknown", count: filteredData.modeAnalytics.unknown },
    ].filter((d) => d.count > 0);
  }, [filteredData.modeAnalytics]);

  const stipendAmountChartData = useMemo(() => {
    return filteredData.stipendAmountAnalytics.distribution.filter(
      (item) => item.count > 0,
    );
  }, [filteredData.stipendAmountAnalytics]);

  const hasBranchData = filteredData.branchDistribution.length > 0;
  const hasCompanyData = companyDonutData.length > 0;
  const hasStipendData = stipendChartData.length > 0;
  const hasStipendAmountData = stipendAmountChartData.length > 0;
  const hasModeData = modeChartData.length > 0;
  const timelineYears = filteredData.submissionTimelineByYear.map(
    (entry) => entry.year,
  );
  const selectedTimelineData =
    filteredData.submissionTimelineByYear.find(
      (entry) => entry.year === selectedTimelineYear,
    ) || filteredData.submissionTimelineByYear.at(-1);
  const hasTimelineData =
    selectedTimelineData?.months.some((month) => month.count > 0) ?? false;

  useEffect(() => {
    if (!timelineYears.length) {
      setSelectedTimelineYear("");
      return;
    }

    if (!timelineYears.includes(selectedTimelineYear)) {
      setSelectedTimelineYear(timelineYears[timelineYears.length - 1]);
    }
  }, [selectedTimelineYear, timelineYears]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Branch Distribution Bar Chart */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Student Distribution by Branch
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            How internships are spread across departments
          </div>
        </div>
        {hasBranchData ? (
          <>
            <AnalyticsBarChart
              data={filteredData.branchDistribution}
              xKey="branch"
              yKey="count"
              height={200}
              xTickFormatter={(value) =>
                value.length > 8 ? value.substring(0, 8) + "..." : value
              }
              getBarFill={(entry, i) =>
                BRANCH_COLORS[entry.branch] || PALETTE[i % PALETTE.length]
              }
            />
            <ChartLegend
              items={filteredData.branchDistribution.map((b, i) => ({
                label: b.branch,
                color: BRANCH_COLORS[b.branch] || PALETTE[i % PALETTE.length],
              }))}
              type="sq"
            />
          </>
        ) : (
          <NoChartData message="No branch data available for the current filters" />
        )}
      </div>

      {/* Company Distribution Donut */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Company Distribution
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            Top hiring companies this cycle
          </div>
        </div>
        {hasCompanyData ? (
          <>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    dataKey="value"
                    stroke="none"
                  >
                    {companyDonutData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={companyDonutColors[i % companyDonutColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              items={companyDonutData.map((c, i) => ({
                label: `${c.name} (${c.value})`,
                color: companyDonutColors[i % companyDonutColors.length],
              }))}
            />
          </>
        ) : (
          <NoChartData message="No company data available for the current filters" />
        )}
      </div>

      {/* Stipend Distribution Donut */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Stipend Distribution
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            Paid vs unpaid vs unknown internships
          </div>
        </div>
        {hasStipendData ? (
          <>
            <div className="h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stipendChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    dataKey="value"
                    stroke="none"
                  >
                    {stipendChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STIPEND_COLORS[entry.name] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              items={stipendChartData.map((d) => ({
                label: `${d.name} (${d.value})`,
                color: STIPEND_COLORS[d.name] || "#9ca3af",
              }))}
            />
          </>
        ) : (
          <NoChartData message="No stipend data available for the current filters" />
        )}
      </div>

      {/* Stipend Amount Distribution */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Stipend Amount
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            Monthly stipend amount distribution in INR
          </div>
        </div>
        {hasStipendAmountData ? (
          <>
            <AnalyticsBarChart
              data={stipendAmountChartData}
              xKey="range"
              yKey="count"
              height={180}
              getBarFill={(_, i) => PALETTE[(i + 2) % PALETTE.length]}
            />
            <div className="mt-3 rounded-lg border border-[#e8eaed] bg-[#fafafa] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.06em] text-[#878c97]">
                Summary
              </div>
              <div className="mt-1 text-sm text-[#3d4047]">
                Avg:{" "}
                <span className="font-semibold text-[#111318]">
                  {filteredData.stipendAmountAnalytics.average == null
                    ? "N/A"
                    : `INR ${filteredData.stipendAmountAnalytics.average.toLocaleString("en-IN")}`}
                </span>
              </div>
              <div className="mt-1 text-xs text-[#878c97]">
                Min{" "}
                {filteredData.stipendAmountAnalytics.min == null
                  ? "N/A"
                  : `INR ${filteredData.stipendAmountAnalytics.min.toLocaleString("en-IN")}`}{" "}
                • Max{" "}
                {filteredData.stipendAmountAnalytics.max == null
                  ? "N/A"
                  : `INR ${filteredData.stipendAmountAnalytics.max.toLocaleString("en-IN")}`}{" "}
                • Records {filteredData.stipendAmountAnalytics.count}
              </div>
            </div>
          </>
        ) : (
          <NoChartData message="No stipend amount data available for the current filters" />
        )}
      </div>

      {/* Mode Distribution Bar Chart */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-1">
          <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
            Internship Mode
          </div>
          <div className="text-sm text-[#878c97] mt-0.5">
            On-site, remote, and hybrid breakdown
          </div>
        </div>
        {hasModeData ? (
          <>
            <AnalyticsBarChart
              data={modeChartData}
              xKey="mode"
              yKey="count"
              height={180}
              getBarFill={(entry) => MODE_COLORS[entry.mode] || "#9ca3af"}
            />
            <ChartLegend
              items={modeChartData.map((d) => ({
                label: `${d.mode} (${d.count})`,
                color: MODE_COLORS[d.mode] || "#9ca3af",
              }))}
              type="sq"
            />
          </>
        ) : (
          <NoChartData message="No internship mode data available for the current filters" />
        )}
      </div>

      {/* Submission Timeline */}
      <div className="bg-white border border-[#e8eaed] rounded-[14px] p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <div className="text-base font-semibold text-[#111318] tracking-[-0.01em]">
              Submission Timeline
            </div>
            <div className="text-sm text-[#878c97] mt-0.5">
              Monthly submission pattern for the selected academic year
            </div>
          </div>
          <Select
            value={selectedTimelineYear}
            onValueChange={setSelectedTimelineYear}
            disabled={!timelineYears.length}
          >
            <SelectTrigger className="w-[124px] h-9 rounded-lg border-[#d1d5dc] text-sm bg-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {timelineYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasTimelineData && selectedTimelineData ? (
          <>
            <AnalyticsBarChart
              data={selectedTimelineData.months}
              xKey="month"
              yKey="count"
              height={160}
              yAxisWidth={24}
              getBarFill={(entry, index) =>
                index === selectedTimelineData.months.length - 1
                  ? "#16a34a"
                  : "#dcfce7"
              }
            />
            <div className="mt-3 rounded-lg border border-[#e8eaed] bg-[#fafafa] px-3 py-2">
              <div className="text-xs uppercase tracking-[0.06em] text-[#878c97]">
                Scope
              </div>
              <div className="mt-1 text-sm text-[#3d4047]">
                Showing month-wise submissions for{" "}
                <span className="font-semibold text-[#111318]">
                  {selectedTimelineData.year}
                </span>
              </div>
            </div>
          </>
        ) : (
          <NoChartData message="No monthly submission data available for the current filters" />
        )}
      </div>
    </div>
  );
}
