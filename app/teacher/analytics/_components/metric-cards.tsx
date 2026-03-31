"use client";

import {
  GraduationCap,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Briefcase,
} from "lucide-react";
import type { FilteredData } from "../_lib/types";

interface MetricCardsProps {
  filteredData: FilteredData;
  paidPercent: number;
}

const metrics = [
  {
    key: "total",
    label: "Total Internships",
    icon: GraduationCap,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    key: "active",
    label: "Active Now",
    icon: CheckCircle,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: ClipboardList,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    key: "paid",
    label: "Paid %",
    icon: DollarSign,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    key: "topRecruiter",
    label: "Top Recruiter",
    icon: Briefcase,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
  },
];

export function MetricCards({ filteredData, paidPercent }: MetricCardsProps) {
  const topRecruiter =
    filteredData.topCompanies[0] && filteredData.topCompanies[0].count > 1
      ? filteredData.topCompanies[0].company
      : "N/A";

  const values: Record<string, string | number> = {
    total: filteredData.totalInternships,
    active: filteredData.activeNow,
    completed: filteredData.completed,
    paid: `${paidPercent}%`,
    topRecruiter,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.key}
            className="bg-white border border-[#e8eaed] rounded-xl px-4 py-4 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-[#d1d5dc] hover:-translate-y-0.5 cursor-default"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.iconBg}`}
              >
                <Icon className={`w-5 h-5 ${m.iconColor}`} />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-[-0.04em] text-[#111318] leading-none mb-1">
              {values[m.key]}
            </div>
            <div className="text-sm text-[#878c97] font-medium">{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}
