"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAnalyticsDisplayLabel,
  getNormalizedAnalyticsKey,
  getPreferredAnalyticsLabel,
} from "@/lib/analytics-normalization";
import type {
  AnalyticsData,
  FilteredData,
  StatusFilter,
  ModeFilter,
  DurationAnalytics,
  DomainTrend,
  StipendAmountAnalytics,
} from "./types";
import { toast } from "sonner";

const ACADEMIC_MONTHS = [
  { label: "Jun", month: 5 },
  { label: "Jul", month: 6 },
  { label: "Aug", month: 7 },
  { label: "Sep", month: 8 },
  { label: "Oct", month: 9 },
  { label: "Nov", month: 10 },
  { label: "Dec", month: 11 },
  { label: "Jan", month: 0 },
  { label: "Feb", month: 1 },
  { label: "Mar", month: 2 },
  { label: "Apr", month: 3 },
  { label: "May", month: 4 },
] as const;

function getAcademicYear(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 5) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

export function useAnalyticsData() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/analytics", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} - ${text}`);
        }

        const data: AnalyticsData = JSON.parse(text);
        setAnalyticsData(data);

        const branches = data.branchAnalytics
          .map((b) => b.branch)
          .filter((b) => b !== "Not Specified")
          .sort();
        setAllBranches(branches);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        console.error("Error fetching analytics:", err);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    } catch (e) {
      console.error(e);
      toast.error("Logout failed : Redirecting to login...");
    } finally {
      router.push("/teacher/login");
      router.refresh();
    }
  }, [router]);

  const filteredData: FilteredData | null = useMemo(() => {
    if (!analyticsData) return null;

    // Start with all raw internships, then apply filters
    let internships = analyticsData.rawInternships;

    // Branch filter
    if (selectedBranch !== "all") {
      internships = internships.filter(
        (i) =>
          getAnalyticsDisplayLabel(i.studentBranch || i.student.branch) ===
          selectedBranch,
      );
    }

    // Status filter
    const now = new Date();
    if (statusFilter === "ongoing") {
      internships = internships.filter(
        (i) => !i.endDate || new Date(i.endDate) > now,
      );
    } else if (statusFilter === "completed") {
      internships = internships.filter(
        (i) => i.endDate && new Date(i.endDate) <= now,
      );
    }

    // Mode filter
    if (modeFilter !== "all") {
      const modeMap: Record<string, string> = {
        onsite: "offline",
        remote: "online",
        hybrid: "hybrid",
      };
      internships = internships.filter(
        (i) => i.mode?.toLowerCase() === modeMap[modeFilter],
      );
    }

    // Compute all analytics from filtered internships
    const branchMap = new Map<string, { label: string; count: number }>();
    const companyMap = new Map<string, { label: string; count: number }>();
    internships.forEach((i) => {
      const branchValue = i.studentBranch || i.student.branch;
      const branchKey = getNormalizedAnalyticsKey(branchValue);
      const companyKey = getNormalizedAnalyticsKey(i.companyName);

      if (!branchMap.has(branchKey)) {
        branchMap.set(branchKey, {
          label: getAnalyticsDisplayLabel(branchValue),
          count: 0,
        });
      }
      if (!companyMap.has(companyKey)) {
        companyMap.set(companyKey, {
          label: getAnalyticsDisplayLabel(i.companyName),
          count: 0,
        });
      }

      const branchEntry = branchMap.get(branchKey)!;
      branchEntry.label = getPreferredAnalyticsLabel(
        branchEntry.label,
        branchValue,
      );
      branchEntry.count++;

      const companyEntry = companyMap.get(companyKey)!;
      companyEntry.label = getPreferredAnalyticsLabel(
        companyEntry.label,
        i.companyName,
      );
      companyEntry.count++;
    });

    const branchDistribution = Array.from(branchMap.entries())
      .map(([, { label, count }]) => ({ branch: label, count }))
      .sort((a, b) => b.count - a.count);

    const companyDistribution = Array.from(companyMap.entries())
      .map(([, { label, count }]) => ({ company: label, count }))
      .sort((a, b) => b.count - a.count);

    // Stipend
    const stipendAnalytics = { paid: 0, unpaid: 0, unknown: 0 };
    internships.forEach((i) => {
      const val = i.stipend?.toLowerCase();
      if (val === "paid") stipendAnalytics.paid++;
      else if (val === "unpaid") stipendAnalytics.unpaid++;
      else stipendAnalytics.unknown++;
    });

    const stipendAmounts = internships
      .map((i) => i.stipendAmount)
      .filter((amount): amount is number => amount !== null && amount !== undefined);
    const stipendAmountRanges = [
      { range: "Below 5k", min: 0, max: 4999 },
      { range: "5k-10k", min: 5000, max: 10000 },
      { range: "10k-20k", min: 10001, max: 20000 },
      { range: "20k-40k", min: 20001, max: 40000 },
      { range: "40k+", min: 40001, max: Infinity },
    ];
    const stipendAmountAnalytics: StipendAmountAnalytics = {
      average:
        stipendAmounts.length > 0
          ? Math.round(
              stipendAmounts.reduce((sum, amount) => sum + amount, 0) /
                stipendAmounts.length,
            )
          : null,
      min: stipendAmounts.length > 0 ? Math.min(...stipendAmounts) : null,
      max: stipendAmounts.length > 0 ? Math.max(...stipendAmounts) : null,
      total: stipendAmounts.reduce((sum, amount) => sum + amount, 0),
      count: stipendAmounts.length,
      distribution: stipendAmountRanges.map(({ range, min, max }) => ({
        range,
        count: stipendAmounts.filter(
          (amount) => amount >= min && amount <= max,
        ).length,
      })),
    };

    // Mode
    const modeAnalytics = { online: 0, offline: 0, hybrid: 0, unknown: 0 };
    internships.forEach((i) => {
      const val = i.mode?.toLowerCase();
      if (val === "online") modeAnalytics.online++;
      else if (val === "offline") modeAnalytics.offline++;
      else if (val === "hybrid") modeAnalytics.hybrid++;
      else modeAnalytics.unknown++;
    });

    // Duration
    const durations = internships
      .map((i) => i.durationWeeks)
      .filter((d): d is number => d !== null && d !== undefined);
    const durationRanges = [
      { range: "1-4 weeks", min: 1, max: 4 },
      { range: "5-8 weeks", min: 5, max: 8 },
      { range: "9-12 weeks", min: 9, max: 12 },
      { range: "13+ weeks", min: 13, max: Infinity },
    ];
    const durationAnalytics: DurationAnalytics = {
      average:
        durations.length > 0
          ? Math.round(
              (durations.reduce((a, b) => a + b, 0) / durations.length) * 10,
            ) / 10
          : 0,
      min: durations.length > 0 ? Math.min(...durations) : 0,
      max: durations.length > 0 ? Math.max(...durations) : 0,
      distribution: durationRanges.map(({ range, min, max }) => ({
        range,
        count: durations.filter((d) => d >= min && d <= max).length,
      })),
    };

    // Year analytics
    const yearMap = new Map<string, number>();
    internships.forEach((i) => {
      const date = i.startDate || i.createdAt;
      const academicYear = getAcademicYear(new Date(date));
      yearMap.set(academicYear, (yearMap.get(academicYear) || 0) + 1);
    });
    const yearAnalytics = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const submissionTimelineMap = new Map<string, Map<string, number>>();
    internships.forEach((i) => {
      const date = new Date(i.startDate || i.createdAt);
      const academicYear = getAcademicYear(date);
      const monthLabel =
        ACADEMIC_MONTHS.find((month) => month.month === date.getMonth())
          ?.label || "Unknown";

      if (!submissionTimelineMap.has(academicYear)) {
        submissionTimelineMap.set(
          academicYear,
          new Map(ACADEMIC_MONTHS.map((month) => [month.label, 0])),
        );
      }

      const months = submissionTimelineMap.get(academicYear)!;
      months.set(monthLabel, (months.get(monthLabel) || 0) + 1);
    });

    const submissionTimelineByYear = Array.from(submissionTimelineMap.entries())
      .map(([year, months]) => ({
        year,
        months: ACADEMIC_MONTHS.map(({ label }) => ({
          month: label,
          count: months.get(label) || 0,
        })),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Branch-company chart
    const branchCompanyMap = new Map<
      string,
      { label: string; companies: Map<string, { label: string; count: number }> }
    >();
    internships.forEach((i) => {
      const branchValue = i.studentBranch || i.student.branch;
      const branchKey = getNormalizedAnalyticsKey(branchValue);
      const companyKey = getNormalizedAnalyticsKey(i.companyName);

      if (!branchCompanyMap.has(companyKey)) {
        branchCompanyMap.set(companyKey, {
          label: getAnalyticsDisplayLabel(i.companyName),
          companies: new Map(),
        });
      }
      const companyEntry = branchCompanyMap.get(companyKey)!;
      companyEntry.label = getPreferredAnalyticsLabel(
        companyEntry.label,
        i.companyName,
      );

      if (!companyEntry.companies.has(branchKey)) {
        companyEntry.companies.set(branchKey, {
          label: getAnalyticsDisplayLabel(branchValue),
          count: 0,
        });
      }
      const branchEntry = companyEntry.companies.get(branchKey)!;
      branchEntry.label = getPreferredAnalyticsLabel(
        branchEntry.label,
        branchValue,
      );
      branchEntry.count++;
    });
    const branchCompanyChart = Array.from(branchCompanyMap.entries())
      .sort((a, b) => {
        const totalA = Array.from(a[1].companies.values()).reduce(
          (sum, val) => sum + val.count,
          0,
        );
        const totalB = Array.from(b[1].companies.values()).reduce(
          (sum, val) => sum + val.count,
          0,
        );
        return totalB - totalA;
      })
      .map(([, { label, companies }]) => {
        const data: Record<string, string | number> = { company: label };
        companies.forEach(({ label: branchLabel, count }) => {
          data[branchLabel] = count;
        });
        return data;
      });

    // Location distribution
    const locationMap = new Map<string, { label: string; count: number }>();
    internships.forEach((i) => {
      const locationKey = getNormalizedAnalyticsKey(i.companyLocation);
      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          label: getAnalyticsDisplayLabel(i.companyLocation),
          count: 0,
        });
      }
      const locationEntry = locationMap.get(locationKey)!;
      locationEntry.label = getPreferredAnalyticsLabel(
        locationEntry.label,
        i.companyLocation,
      );
      locationEntry.count++;
    });
    const locationDistribution = Array.from(locationMap.entries())
      .map(([, { label, count }]) => ({ location: label, count }))
      .sort((a, b) => b.count - a.count);

    // Domain distribution
    const domainMap = new Map<string, { label: string; count: number }>();
    internships.forEach((i) => {
      const domainKey = getNormalizedAnalyticsKey(i.domain);
      if (!domainMap.has(domainKey)) {
        domainMap.set(domainKey, {
          label: getAnalyticsDisplayLabel(i.domain),
          count: 0,
        });
      }
      const domainEntry = domainMap.get(domainKey)!;
      domainEntry.label = getPreferredAnalyticsLabel(domainEntry.label, i.domain);
      domainEntry.count++;
    });
    const domainDistribution = Array.from(domainMap.entries())
      .map(([, { label, count }]) => ({ domain: label, count }))
      .sort((a, b) => b.count - a.count);

    // Domain trends over time (top domains by academic year)
    const domainYearMap = new Map<
      string,
      Map<string, { label: string; count: number }>
    >();
    internships.forEach((i) => {
      const domainKey = getNormalizedAnalyticsKey(i.domain);
      const date = i.startDate || i.createdAt;
      const year = getAcademicYear(new Date(date));
      if (!domainYearMap.has(year)) {
        domainYearMap.set(year, new Map());
      }
      const yearDomains = domainYearMap.get(year)!;
      if (!yearDomains.has(domainKey)) {
        yearDomains.set(domainKey, {
          label: getAnalyticsDisplayLabel(i.domain),
          count: 0,
        });
      }
      const domainEntry = yearDomains.get(domainKey)!;
      domainEntry.label = getPreferredAnalyticsLabel(domainEntry.label, i.domain);
      domainEntry.count++;
    });
    // Get top 6 domains for the chart
    const topDomains = domainDistribution.slice(0, 6).map((d) => d.domain);
    const domainTrends: DomainTrend[] = Array.from(domainYearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, domains]) => {
        const entry: DomainTrend = { year };
        topDomains.forEach((dom) => {
          const domainKey = getNormalizedAnalyticsKey(dom);
          entry[dom] = domains.get(domainKey)?.count || 0;
        });
        return entry;
      });

    // Attendance by branch (from server, filter by selected branch)
    const attendanceByBranch =
      selectedBranch === "all"
        ? analyticsData.attendanceAnalytics
        : analyticsData.attendanceAnalytics.filter(
            (a) => a.branch === selectedBranch,
          );

    // Active vs completed counts
    const activeNow = internships.filter(
      (i) => !i.endDate || new Date(i.endDate) > now,
    ).length;
    const completed = internships.filter(
      (i) => i.endDate && new Date(i.endDate) <= now,
    ).length;

    return {
      totalInternships: internships.length,
      activeNow,
      completed,
      uniqueBranches: branchMap.size,
      uniqueCompanies: companyMap.size,
      branchDistribution,
      companyDistribution,
      topCompanies: companyDistribution.slice(0, 10),
      branchCompanyChart,
      stipendAnalytics,
      stipendAmountAnalytics,
      modeAnalytics,
      durationAnalytics,
      yearAnalytics,
      submissionTimelineByYear,
      locationDistribution,
      domainDistribution,
      domainTrends,
      domainTrendKeys: topDomains,
      attendanceByBranch,
    };
  }, [analyticsData, selectedBranch, statusFilter, modeFilter]);

  const paidPercent = useMemo(() => {
    if (!filteredData) return 0;
    const total =
      filteredData.stipendAnalytics.paid +
      filteredData.stipendAnalytics.unpaid +
      filteredData.stipendAnalytics.unknown;
    if (total === 0) return 0;
    return Math.round((filteredData.stipendAnalytics.paid / total) * 100);
  }, [filteredData]);

  const generateCSV = useCallback(() => {
    if (!analyticsData || !filteredData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "INTERNSHIP ANALYTICS REPORT\n";
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Filter: ${selectedBranch === "all" ? "All Branches" : selectedBranch}\n\n`;

    csvContent += "SUMMARY STATISTICS\n";
    csvContent += `Total Internships,${filteredData.totalInternships}\n`;
    csvContent += `Number of Branches,${filteredData.uniqueBranches}\n`;
    csvContent += `Number of Companies,${filteredData.uniqueCompanies}\n\n`;

    csvContent += "BRANCH DISTRIBUTION\n";
    csvContent += "Branch,Number of Internships\n";
    filteredData.branchDistribution.forEach((item) => {
      csvContent += `${item.branch},${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "COMPANY DISTRIBUTION\n";
    csvContent += "Company,Number of Internships\n";
    filteredData.companyDistribution.forEach((item) => {
      csvContent += `${item.company},${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "TOP COMPANIES\n";
    csvContent += "Rank,Company,Number of Interns\n";
    filteredData.topCompanies.forEach((item, index) => {
      csvContent += `${index + 1},${item.company},${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "STIPEND DISTRIBUTION\n";
    csvContent += "Type,Count\n";
    csvContent += `Paid,${filteredData.stipendAnalytics.paid}\n`;
    csvContent += `Unpaid,${filteredData.stipendAnalytics.unpaid}\n`;
    csvContent += `Unknown,${filteredData.stipendAnalytics.unknown}\n\n`;

    csvContent += "STIPEND AMOUNT STATISTICS\n";
    csvContent += `Records With Amount,${filteredData.stipendAmountAnalytics.count}\n`;
    csvContent += `Average Monthly Stipend (INR),${filteredData.stipendAmountAnalytics.average ?? "N/A"}\n`;
    csvContent += `Min Monthly Stipend (INR),${filteredData.stipendAmountAnalytics.min ?? "N/A"}\n`;
    csvContent += `Max Monthly Stipend (INR),${filteredData.stipendAmountAnalytics.max ?? "N/A"}\n`;
    csvContent += `Total Monthly Stipend Sum (INR),${filteredData.stipendAmountAnalytics.total}\n`;
    csvContent += "STIPEND AMOUNT DISTRIBUTION\n";
    csvContent += "Range,Count\n";
    filteredData.stipendAmountAnalytics.distribution.forEach((item) => {
      csvContent += `${item.range},${item.count}\n`;
    });
    csvContent += "\n";

    csvContent += "MODE DISTRIBUTION\n";
    csvContent += "Mode,Count\n";
    csvContent += `Online,${filteredData.modeAnalytics.online}\n`;
    csvContent += `Offline,${filteredData.modeAnalytics.offline}\n`;
    csvContent += `Hybrid,${filteredData.modeAnalytics.hybrid}\n`;
    csvContent += `Unknown,${filteredData.modeAnalytics.unknown}\n\n`;

    csvContent += "DURATION STATISTICS\n";
    csvContent += `Average Duration (weeks),${filteredData.durationAnalytics.average}\n`;
    csvContent += `Min Duration (weeks),${filteredData.durationAnalytics.min}\n`;
    csvContent += `Max Duration (weeks),${filteredData.durationAnalytics.max}\n\n`;
    csvContent += "DURATION DISTRIBUTION\n";
    csvContent += "Range,Count\n";
    filteredData.durationAnalytics.distribution.forEach((d) => {
      csvContent += `${d.range},${d.count}\n`;
    });
    csvContent += "\n";

    csvContent += "YEAR-WISE DISTRIBUTION\n";
    csvContent += "Academic Year,Count\n";
    filteredData.yearAnalytics.forEach((y) => {
      csvContent += `${y.year},${y.count}\n`;
    });
    csvContent += "\n";

    csvContent += "LOCATION DISTRIBUTION\n";
    csvContent += "Location,Count\n";
    filteredData.locationDistribution.forEach((l) => {
      csvContent += `${l.location},${l.count}\n`;
    });
    csvContent += "\n";

    csvContent += "DOMAIN DISTRIBUTION\n";
    csvContent += "Domain,Count\n";
    filteredData.domainDistribution.forEach((d) => {
      csvContent += `${d.domain},${d.count}\n`;
    });
    csvContent += "\n";

    if (
      filteredData.domainTrends.length > 0 &&
      filteredData.domainTrendKeys.length > 0
    ) {
      csvContent += "DOMAIN TRENDS BY ACADEMIC YEAR\n";
      csvContent += `Academic Year,${filteredData.domainTrendKeys.join(",")}\n`;
      filteredData.domainTrends.forEach((row) => {
        const values = filteredData.domainTrendKeys.map((k) => row[k] || 0);
        csvContent += `${row.year},${values.join(",")}\n`;
      });
      csvContent += "\n";
    }

    csvContent += "ATTENDANCE BY BRANCH\n";
    csvContent += "Branch,Total,Verified,Rate %\n";
    filteredData.attendanceByBranch.forEach((a) => {
      csvContent += `${a.branch},${a.total},${a.verified},${a.rate}\n`;
    });
    csvContent += "\n";

    if (
      filteredData.branchCompanyChart &&
      filteredData.branchCompanyChart.length > 0
    ) {
      csvContent += "BRANCH-WISE COMPANY DISTRIBUTION\n";
      const branches = Object.keys(
        filteredData.branchCompanyChart[0] || {},
      ).filter((k) => k !== "company");
      csvContent += `Company,${branches.join(",")}\n`;
      filteredData.branchCompanyChart.forEach(
        (item: Record<string, string | number>) => {
          const values = branches.map((b) => item[b] || 0);
          csvContent += `${item.company},${values.join(",")}\n`;
        },
      );
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `internship-analytics-${selectedBranch}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [analyticsData, filteredData, selectedBranch]);

  return {
    analyticsData,
    filteredData,
    loading,
    error,
    selectedBranch,
    setSelectedBranch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    allBranches,
    paidPercent,
    generateCSV,
    handleLogout,
  };
}
