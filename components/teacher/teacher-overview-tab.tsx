"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const AnalyticsBarChart = dynamic(
  () =>
    import("@/app/teacher/analytics/_components/analytics-bar-chart").then(
      (mod) => mod.AnalyticsBarChart,
    ),
  { ssr: false },
);

interface InternshipFormData {
  id: string;
  companyName: string;
  studentName?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  startDate?: string | null;
  endDate?: string | null;
  stipend?: string | null;
  studentBranch?: string | null;
  studentDivision?: string | null;
  student?: { id: string; name?: string | null; email?: string | null } | null;
  attendances?: Array<{ id: string; status: string; date: string }>;
}

interface OverviewMonth {
  key: string;
  label: string;
  count: number;
}

interface TeacherOverviewTabProps {
  forms: InternshipFormData[];
  teacherName: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  activeInternships: InternshipFormData[];
  overviewMonths: { months: OverviewMonth[]; max: number };
  paidUnpaidRatio: string;
  approvedLikeCount: number;
  mounted: boolean;
  // lets the overview trigger tab switches without owning tab state
  onTabChange: (tab: string) => void;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getTodayLabel = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// how many days until the internship ends
const getDaysLeft = (endDate?: string | null) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getFormStudentName = (form: InternshipFormData) =>
  form.studentName || form.student?.name || "Unknown Student";

const getActivityLabel = (form: InternshipFormData) => {
  if (form.status === "COMPLETED") return "Completed";
  if (form.status !== "APPROVED") return "Not Active";
  const now = new Date();
  const startDate = form.startDate ? new Date(form.startDate) : null;
  const endDate = form.endDate ? new Date(form.endDate) : null;
  if (startDate && now < startDate) return "Starts Soon";
  if (endDate && now > endDate) return "Ended";
  return form.isActive ? "Active" : "Inactive";
};

const getActivityTone = (label: string) => {
  if (label === "Active") return "bg-emerald-50 text-emerald-700";
  if (label === "Starts Soon") return "bg-blue-50 text-blue-700";
  if (label === "Completed") return "bg-green-50 text-green-700";
  if (label === "Ended") return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
};

const getStatusTone = (status: string) => {
  if (status === "APPROVED") return "bg-green-50 text-green-700";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-700";
};

// staggered mount animation: cards slide up on first render
const revealCard = (mounted: boolean, delayMs: number) => ({
  className: `transition-all duration-500 ease-out ${
    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`,
  style: { transitionDelay: `${delayMs}ms` },
});

export function TeacherOverviewTab({
  forms,
  teacherName,
  stats,
  activeInternships,
  overviewMonths,
  paidUnpaidRatio,
  approvedLikeCount,
  mounted,
  onTabChange,
}: TeacherOverviewTabProps) {
  if (forms.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-24 text-center transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <FileText className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          No student forms yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Once students submit their internship forms you'll see stats, recent
          activity, and analytics right here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting header*/}
      <section
        className={`flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-center lg:justify-between ${revealCard(mounted, 0).className}`}
        style={revealCard(mounted, 0).style}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {getTodayLabel()}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-gray-900 sm:text-[28px]">
            {getGreeting()},{" "}
            <span className="text-emerald-600">{teacherName}</span>
          </h1>
        </div>

        <button
          onClick={() => onTabChange("approvals")}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-transparent px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
        >
          <ShieldCheck className="h-4 w-4" />
          Review Queue
        </button>
      </section>

      {/* Four top-level stat cards */}
      <section
        className={`overflow-hidden rounded-2xl border border-gray-200 bg-white ${revealCard(mounted, 90).className}`}
        style={revealCard(mounted, 90).style}
      >
        <div className="grid grid-cols-1 divide-y divide-gray-200 md:grid-cols-2 md:divide-y-0 xl:grid-cols-4 xl:divide-x">
          {[
            {
              label: "Total Forms",
              value: stats.total,
              icon: FileText,
              tone: "bg-blue-50 text-blue-600",
            },
            {
              label: "Pending Review",
              value: stats.pending,
              icon: Clock,
              tone: "bg-amber-50 text-amber-600",
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: CheckCircle,
              tone: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              icon: XCircle,
              tone: "bg-red-50 text-red-600",
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`flex items-center gap-4 px-5 py-5 transition-colors duration-200 hover:bg-gray-50/80 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-3"
              }`}
              style={{ transitionDelay: `${140 + index * 70}ms` }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-[-0.04em] text-gray-900">
                  {item.value}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity + Active internships */}
      <section
        className={`grid gap-4 xl:grid-cols-2 xl:items-stretch ${revealCard(mounted, 180).className}`}
        style={revealCard(mounted, 180).style}
      >
        {/* Recent submissions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Recent activity
            </p>
            {/* jump to Approvals to see the full pending list */}
            <button
              onClick={() => onTabChange("approvals")}
              className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-800"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white xl:h-[224px]">
            <div className="h-full overflow-y-auto">
              {forms.slice(0, 3).map((form, index) => {
                // compute once per row — avoids redundant date math on every render pass
                const studentName = getFormStudentName(form);
                const activityLabel = getActivityLabel(form);
                return (
                  <button
                    key={form.id}
                    onClick={() =>
                      onTabChange(
                        form.status === "PENDING" ? "approvals" : "students",
                      )
                    }
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all duration-300 hover:bg-gray-50 hover:translate-x-1 hover:-translate-y-0.5 hover:shadow-lg ${index < 2 ? "border-b border-gray-200" : ""} ${
                      mounted
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                    }`}
                    style={{ transitionDelay: `${240 + index * 70}ms` }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
                      {getInitials(studentName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">
                        {studentName}{" "}
                        <span className="font-medium text-gray-500">
                          submitted
                        </span>{" "}
                        {form.companyName}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {fmtDate(form.createdAt)} •{" "}
                        {form.studentBranch || "No branch"} •{" "}
                        {form.studentDivision
                          ? `Div ${form.studentDivision}`
                          : "No division"}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusTone(form.status)}`}
                      >
                        {form.status}
                      </span>
                      {activityLabel !== "Not Active" ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getActivityTone(activityLabel)}`}
                        >
                          {activityLabel}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active internships */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Active internships
            </p>
            {/* jump to Students for the complete view */}
            <button
              onClick={() => onTabChange("students")}
              className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-800"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white xl:h-[224px]">
            {activeInternships.length === 0 ? (
              <div className="flex h-full items-center justify-center px-5 py-12 text-center">
                <BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-900">
                  No active internships
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {activeInternships.slice(0, 3).map((form, index) => {
                  const daysLeft = getDaysLeft(form.endDate);
                  return (
                    <div
                      key={form.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-gray-50 ${index < 2 ? "border-b border-gray-200" : ""} ${
                        mounted
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                      }`}
                      style={{ transitionDelay: `${280 + index * 70}ms` }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-700">
                        {getInitials(getFormStudentName(form))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {getFormStudentName(form)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {form.companyName} • ends {fmtDate(form.endDate)}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Active
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {daysLeft != null
                            ? `${daysLeft} days left`
                            : "No end date"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/*  Analytics snapshot */}
      <section
        className={revealCard(mounted, 260).className}
        style={revealCard(mounted, 260).style}
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          Analytics snapshot
        </p>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Placement overview
              </p>
              <p className="mt-1 text-xs text-gray-500">
                This academic year • {stats.total} submissions
              </p>
            </div>
            <Link
              href="/teacher/analytics"
              className="group inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-green-600 hover:text-white"
            >
              View full analytics
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Quick metrics row */}
          <div className="grid grid-cols-2 border-b border-gray-200 md:grid-cols-4">
            {[
              {
                label: "Approval rate",
                value: `${stats.total ? Math.round((approvedLikeCount / stats.total) * 100) : 0}%`,
                tone: "text-emerald-600",
              },
              {
                label: "Active now",
                value: activeInternships.length,
                tone: "text-gray-900",
              },
              {
                label: "Completed",
                value: forms.filter((f) => f.status === "COMPLETED").length,
                tone: "text-blue-600",
              },
              {
                label: "Paid : Unpaid",
                value: paidUnpaidRatio,
                tone: "text-amber-600",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`px-4 py-4 text-center md:border-r md:border-gray-200 ${index === 0 ? "border-b border-gray-200 md:border-b-0" : ""}`}
              >
                <p
                  className={`text-2xl font-bold tracking-[-0.03em] ${item.tone}`}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Submission trend bar chart */}
          <div className="px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Recent submission trend
            </p>
            <AnalyticsBarChart
              data={overviewMonths.months.slice(-4)}
              xKey="label"
              yKey="count"
              height={132}
              yAxisWidth={0}
              getBarFill={(month) =>
                month.count === overviewMonths.max && month.count > 0
                  ? "#16a34a"
                  : "#dcfce7"
              }
            />
            <p className="mt-2 text-xs text-gray-500">
              A quick snapshot of recent activity. Open analytics for the full
              breakdown.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
