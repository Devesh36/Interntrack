"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InternshipForm } from "@/components/student/internship-form";
import {
  AttendanceTracker,
  type AttendanceTrackerForm,
} from "@/components/student/attendance-tracker";
import { AttendanceHeatmap } from "@/components/student/attendance-heatmap";
import type { AttendanceHeatmapRecord } from "@/components/student/attendance-heatmap";
import { toast } from "sonner";
import {
  GraduationCap,
  FileText,
  Calendar,
  LogOut,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Menu,
  MapPin,
  Search,
  LayoutGrid,
  ChevronRight,
  User,
  Mail,
  GitBranch,
  Users,
  ArrowLeft,
} from "lucide-react";

interface InternshipFormData {
  id: string;
  companyName: string;
  companyLocation?: string;
  domain?: string;
  durationWeeks?: number;
  startDate?: string;
  endDate?: string;
  stipend?: string;
  stipendAmount?: number | null;
  mode?: string;
  offerLetterURL?: string;
  deptCoordinatorEmail?: string;
  hrEmail?: string;
  rejectionReason?: string | null;
  status: string;
  createdAt: string;
  teacher: { name: string; email: string };
  attendances: {
    id: string;
    date: string;
    status: string;
    createdAt?: string;
    location?: string | null;
    verifiedAt?: string | null;
  }[];
  isActive: boolean;
}

// ── Helpers ──

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const COMPANY_COLORS = [
  "text-blue-600",
  "text-green-600",
  "text-amber-600",
  "text-red-600",
  "text-violet-600",
];

const getCompanyColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COMPANY_COLORS[Math.abs(h) % COMPANY_COLORS.length];
};

const toLocalDateKey = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  forms: "Internship Forms",
  attendance: "Attendance",
  profile: "Profile",
};

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  branch: string | null;
  division: string | null;
  createdAt: string;
}

// ── Component ──

export default function StudentDashboard() {
  const [forms, setForms] = useState<InternshipFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAttendanceCompany, setSelectedAttendanceCompany] = useState<
    string | null
  >(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchForms();
    fetchUser();
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch("/api/internship-form", {
        cache: "no-store",
      });
      if (response.ok) {
        setForms(await response.json());
      } else {
        toast.error("Could not load internship forms.");
      }
    } catch (error) {
      console.error("Failed to fetch forms:", error);
      toast.error("Failed to load forms : A network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      } else {
        toast.error("Could not load user profile.");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      toast.error("Failed to load profile : A network error occurred.");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error(`Logout failed: ${res.status}`);
    } catch (e) {
      console.error(e);
      toast.error("Logout failed : Redirecting to login...");
    } finally {
      router.push("/student/login");
      router.refresh();
    }
  };

  // ── Computed ──

  const userName = userProfile?.name ?? null;

  const stats = {
    total: forms.length,
    pending: forms.filter((f) => f.status === "PENDING").length,
    approved: forms.filter((f) => f.status === "APPROVED").length,
    rejected: forms.filter((f) => f.status === "REJECTED").length,
    totalAttendance: forms.reduce(
      (sum, f) =>
        sum + (Array.isArray(f.attendances) ? f.attendances.length : 0),
      0,
    ),
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch = form.companyName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeForm = forms.find((f) => f.status === "APPROVED" && f.isActive);

  const attendanceForms: AttendanceTrackerForm[] = forms.map((form) => ({
    ...form,
    attendances: (form.attendances || []).map((attendance) => ({
      ...attendance,
      createdAt: attendance.createdAt ?? attendance.date,
      location: attendance.location ?? null,
      verifiedAt: attendance.verifiedAt ?? null,
    })),
  }));

  // ── Monthly calendar data ──
  const getMonthCalendar = () => {
    if (!activeForm) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

    const attendanceMap = new Map<number, string>();
    activeForm.attendances.forEach((a) => {
      const d = new Date(a.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        attendanceMap.set(d.getDate(), a.status);
      }
    });

    const cells: { day: number; type: string }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, type: "empty" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isFuture = d > today;
      const status = attendanceMap.get(d);
      if (isFuture || isWeekend) cells.push({ day: d, type: "future" });
      else if (status === "VERIFIED") cells.push({ day: d, type: "present" });
      else if (status === "ABSENT") cells.push({ day: d, type: "absent" });
      else if (status === "PENDING") cells.push({ day: d, type: "pending" });
      else cells.push({ day: d, type: "future" });
    }

    const presentCount = Array.from(attendanceMap.values()).filter(
      (s) => s === "VERIFIED",
    ).length;
    let workDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0 && dow !== 6) workDays++;
    }

    // Prepare data for heatmap
    const allDays: AttendanceHeatmapRecord[] = activeForm.attendances.map(
      (a) => ({
        date: toLocalDateKey(new Date(a.date)),
        status:
          a.status === "VERIFIED"
            ? "present"
            : a.status === "ABSENT"
              ? "absent"
              : a.status === "PENDING"
                ? "pending"
                : "none",
      }),
    );

    return {
      cells,
      monthName: now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      presentCount,
      workDays,
      startDate: activeForm.startDate,
      endDate: activeForm.endDate,
      allDays,
      status: activeForm.status,
      companyName: activeForm.companyName,
      role: activeForm.domain,
      teacherName: activeForm.teacher?.name,
    };
  };

  function fmtDate(value: string | Date | null | undefined): string {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function durationBetween(
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
  ): string {
    if (!start || !end) return "-";
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return "-";
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(
      0,
      Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay),
    );
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  // ── Status badge ──
  const statusPill = (label: string, styles: string) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      {label}
    </span>
  );

  const approvalStatusBadge = (status: string) => {
    const s: Record<string, string> = {
      APPROVED: "bg-green-50 text-green-600",
      REJECTED: "bg-red-50 text-red-600",
      PENDING: "bg-amber-50 text-amber-600",
      COMPLETED: "bg-green-50 text-green-600",
    };
    return statusPill(
      status.charAt(0) + status.slice(1).toLowerCase(),
      s[status] || "bg-gray-50 text-gray-600",
    );
  };

  const internshipActivityBadge = (form: InternshipFormData) => {
    const today = new Date();
    const startDate = form.startDate ? new Date(form.startDate) : null;
    const endDate = form.endDate ? new Date(form.endDate) : null;

    if (form.status === "COMPLETED") {
      return statusPill("Completed", "bg-green-50 text-green-600");
    }

    if (form.status !== "APPROVED") {
      return statusPill("Not Active", "bg-gray-50 text-gray-600");
    }

    if (startDate && today < startDate) {
      return statusPill("Starts Soon", "bg-blue-50 text-blue-600");
    }

    if (endDate && today > endDate) {
      return statusPill("Ended", "bg-rose-50 text-rose-600");
    }

    if (form.isActive) {
      return statusPill("Active", "bg-emerald-50 text-emerald-600");
    }

    return statusPill("Inactive", "bg-gray-50 text-gray-600");
  };

  // ── Fade animation helper ──
  const fade = (delay: string = "") =>
    `transition-all duration-500 ease-out ${delay} ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;

  // ── Sidebar nav items ──
  const sidebarLinks = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    {
      key: "forms",
      label: "Internship Forms",
      icon: FileText,
      badge: stats.pending,
    },
    { key: "attendance", label: "Attendance", icon: Calendar },
    { key: "profile", label: "Profile", icon: User },
  ];

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 h-14 flex items-center px-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
        </nav>
        <div className="flex">
          <aside className="hidden lg:block w-56 border-r border-gray-200 bg-white p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </aside>
          <main className="flex-1 p-7 space-y-6">
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-5 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[84px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#fafafa]/90 backdrop-blur-xl border-b border-gray-200 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Mobile: Hamburger or Back Button */}
          <div className="lg:hidden">
            {activeTab === "overview" ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="w-9 h-9 rounded-lg hover:bg-gray-100 grid place-items-center transition-colors">
                    <Menu className="w-5 h-5 text-gray-700" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Student menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate between dashboard sections.
                  </SheetDescription>
                  <div className="p-4 border-b border-gray-200">
                    {userName && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border-[1.5px] border-blue-200 grid place-items-center text-sm font-bold text-blue-600">
                          {getInitials(userName)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {userName}
                          </div>
                          <div className="text-xs text-gray-400">Student</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <nav className="p-3 space-y-0.5">
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300 px-2.5 pt-2 pb-1.5 block">
                      Menu
                    </span>
                    {sidebarLinks.map((link) => (
                      <button
                        key={link.key}
                        onClick={() => {
                          setActiveTab(link.key);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                          activeTab === link.key
                            ? "bg-blue-50 text-blue-600 font-semibold"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <link.icon className="w-4 h-4 flex-shrink-0" />
                        {link.label}
                        {link.badge ? (
                          <span className="ml-auto bg-red-50 text-red-600 rounded-full text-[11px] font-bold px-1.5 py-px">
                            {link.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            ) : (
              <button
                onClick={() => setActiveTab("overview")}
                className="w-9 h-9 rounded-lg hover:bg-gray-100 grid place-items-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-gray-900 grid place-items-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-gray-900 leading-tight tracking-tight">
              Interntrack
            </span>
            <span className="text-xs text-gray-400 leading-none">
              Student Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {userName && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 border-[1.5px] border-blue-200 grid place-items-center text-xs font-bold text-blue-600">
                {getInitials(userName)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700 leading-tight">
                  {userName}
                </span>
                <span className="text-xs text-gray-400 leading-none">
                  Student
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-56px)]">
        {/* ── SIDEBAR (desktop) ── */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 bg-white border-r border-gray-200 flex-col gap-0.5 p-3 sticky top-14 h-[calc(100vh-56px)]">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300 px-2.5 pt-2 pb-1.5">
            Menu
          </span>
          {sidebarLinks.map((link) => (
            <button
              key={link.key}
              onClick={() => setActiveTab(link.key)}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                activeTab === link.key
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <link.icon
                className={`w-4 h-4 flex-shrink-0 ${
                  activeTab === link.key ? "text-blue-600" : "text-gray-400"
                }`}
              />
              {link.label}
              {link.badge ? (
                <span className="ml-auto bg-red-50 text-red-600 rounded-full text-[11px] font-bold px-1.5 py-px">
                  {link.badge}
                </span>
              ) : null}
            </button>
          ))}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 px-5 sm:px-8 py-7">
          {/* Page header */}
          <div className={`mb-6 ${fade()}`}>
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1.5">
              <span className="text-gray-600">Student Dashboard</span>
              <span>/</span>
              <span>{TAB_LABELS[activeTab]}</span>
              {activeTab === "attendance" && selectedAttendanceCompany ? (
                <>
                  <span>/</span>
                  <span className="truncate max-w-[240px] sm:max-w-[360px]">
                    {selectedAttendanceCompany}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {activeTab === "overview"
                    ? `${getGreeting()}, ${userName || "Student"}`
                    : TAB_LABELS[activeTab]}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {activeTab === "overview" &&
                    "Manage your internship journey and track your progress"}
                  {activeTab === "forms" &&
                    "View and submit your internship forms"}
                  {activeTab === "attendance" &&
                    "Track your daily attendance and verification status"}
                  {activeTab === "profile" &&
                    "View and manage your account information"}
                </p>
              </div>
              {activeTab === "overview" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("forms")}
                    className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-white transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                  <Button
                    onClick={() => {
                      setActiveTab("forms");
                      setShowNewForm(true);
                    }}
                    className="h-9 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Form
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/*  OVERVIEW  */}
          {activeTab === "overview" && (
            <>
              {/* Metrics */}
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 ${fade("delay-75")}`}
              >
                {[
                  {
                    label: "Total Applications",
                    value: stats.total,
                    icon: FileText,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                  },
                  {
                    label: "Approved",
                    value: stats.approved,
                    icon: CheckCircle,
                    bg: "bg-green-50",
                    color: "text-green-600",
                  },
                  {
                    label: "Pending",
                    value: stats.pending,
                    icon: Clock,
                    bg: "bg-amber-50",
                    color: "text-amber-600",
                  },
                  {
                    label: "Rejected",
                    value: stats.rejected,
                    icon: XCircle,
                    bg: "bg-red-50",
                    color: "text-red-600",
                  },
                  {
                    label: "Attendance Days",
                    value: stats.totalAttendance,
                    icon: Calendar,
                    bg: "bg-violet-50",
                    color: "text-violet-600",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-200 cursor-default"
                  >
                    <div
                      className={`w-10 h-10 rounded-[10px] flex-shrink-0 grid place-items-center ${m.bg}`}
                    >
                      <m.icon className={`w-5 h-5 ${m.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tracking-tighter text-gray-900 leading-none">
                        {m.value}
                      </p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {m.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick action buttons */}
              <div
                className={`flex items-center gap-2 mb-5 ${fade("delay-100")}`}
              >
                <Button
                  onClick={() => {
                    setActiveTab("forms");
                    setShowNewForm(true);
                  }}
                  className="h-9 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/25"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Form
                </Button>
                <button
                  onClick={() => setActiveTab("attendance")}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-white transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  Mark Attendance
                </button>
              </div>

              {/* Section heading */}
              <div
                className={`flex items-center justify-between mb-3.5 ${fade("delay-150")}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-blue-600">
                  <div className="w-[3px] h-[13px] bg-blue-600 rounded-full" />
                  Recent Applications
                </div>
                <span className="text-sm text-gray-400 font-medium">
                  {stats.total} total
                </span>
              </div>

              {/* Application table */}
              {forms.length === 0 ? (
                <div
                  className={`bg-white border border-gray-200 rounded-xl p-12 text-center ${fade("delay-150")}`}
                >
                  <div className="w-16 h-16 bg-blue-50 rounded-full grid place-items-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Internship Forms Yet
                  </h3>
                  <p className="text-sm text-gray-500 mb-1.5 max-w-md mx-auto">
                    Get started by submitting your first internship form. Your
                    teacher will review and approve it.
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    Once approved, you can start tracking your attendance.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveTab("forms");
                      setShowNewForm(true);
                    }}
                    className="h-9 rounded-lg text-sm bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Your First Form
                  </Button>
                </div>
              ) : (
                <div
                  className={`bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 ${fade("delay-150")}`}
                >
                  {/* Table header */}
                  <div className="hidden uppercase sm:grid grid-cols-[minmax(0,1fr)_130px_140px_130px_130px] gap-4 px-5 py-3.5 text-xs font-bold text-gray-500 bg-[#fafafa] border-b border-gray-200">
                    <div>Company</div>
                    <div>Teacher</div>
                    <div>Submitted</div>
                    <div>Approval Status</div>
                    <div>Internship Status</div>
                  </div>
                  {/* Rows */}
                  {forms.slice(0, 6).map((form) => (
                    <div
                      key={form.id}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_130px_140px_130px_130px] gap-2 sm:gap-4 items-start sm:items-center px-5 py-4 border-b border-gray-200 last:border-b-0 hover:bg-[#fdfdfd] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-[9px] border border-gray-200 bg-[#fafafa] grid place-items-center text-sm font-bold flex-shrink-0 ${getCompanyColor(form.companyName)}`}
                        >
                          {getInitials(form.companyName)}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900">
                            {form.companyName}
                          </p>
                          {form.domain && (
                            <p className="text-sm text-gray-400 mt-0.5">
                              {form.domain}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 font-medium sm:block hidden">
                        {form.teacher.name}
                      </div>
                      <div className="text-sm text-gray-400 sm:block hidden">
                        {new Date(form.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="sm:justify-self-start">
                        {approvalStatusBadge(form.status)}
                      </div>
                      <div className="sm:justify-self-start">
                        {internshipActivityBadge(form)}
                      </div>
                      {/* Mobile-only meta */}
                      <div className="sm:hidden text-xs text-gray-400 flex flex-col items-start gap-2.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span>{form.teacher.name}</span>
                          <span className="text-gray-300">&middot;</span>
                          <span>
                            {new Date(form.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-gray-500">
                              Approval
                            </span>
                            {approvalStatusBadge(form.status)}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-gray-500">
                              Internship
                            </span>
                            {internshipActivityBadge(form)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Company info + Attendance */}
              <div className={`w-full ${fade("delay-200")}`}>
                {/* Attendance GitHub-style Heatmap */}
                <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  {(() => {
                    const cal = getMonthCalendar();
                    if (!cal) {
                      return (
                        <div className="text-center py-6 px-5">
                          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            No approved internship yet
                          </p>
                        </div>
                      );
                    }

                    const internStart = cal.startDate
                      ? new Date(cal.startDate)
                      : null;
                    const internEnd = cal.endDate
                      ? new Date(cal.endDate)
                      : null;

                    return (
                      <>
                        {/* Internship Info Bar */}
                        <div className="flex items-center gap-2 md:gap-3 px-6 pt-5 pb-4 flex-wrap">
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                              {cal.companyName?.[0] ?? "I"}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 leading-tight">
                                {cal.companyName ?? "Internship"}
                              </div>
                              <div className="text-[11px] text-gray-400 leading-tight">
                                {cal.role ?? "Role"}
                              </div>
                            </div>
                          </div>

                          <div className="w-px self-stretch bg-gray-200 shrink-0 hidden md:block mx-1" />

                          <div className="flex items-center gap-1.5 flex-wrap font-medium text-md">
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                              <span className="text-[10px] font-semibold text-gray-500 tracking-[0.08em] uppercase">
                                Start
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700">
                                {fmtDate(internStart)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                              <span className="text-[10px] font-semibold text-gray-500 tracking-[0.08em] uppercase">
                                End
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700">
                                {fmtDate(internEnd)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                              <span className="text-[10px] font-semibold text-gray-500 tracking-[0.08em] uppercase">
                                Duration
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700">
                                {durationBetween(internStart, internEnd)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                              <span className="text-[10px] font-semibold text-gray-500 tracking-[0.08em] uppercase">
                                Teacher
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700">
                                {cal.teacherName ?? "\u2014"}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                              <span className="text-[10px] font-semibold text-green-500 tracking-[0.08em] uppercase">
                                Days
                              </span>
                              <span className="text-[11px] font-bold text-green-600">
                                {cal.presentCount} / {cal.workDays}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1 bg-green-50 border border-green-100 text-green-600 rounded-full px-2.5 py-1 text-[11px] font-bold">
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 9 9"
                                fill="none"
                              >
                                <circle
                                  cx="4.5"
                                  cy="4.5"
                                  r="3.5"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                />
                                <path
                                  d="M3 4.5l1.2 1.2L6.5 3"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {(cal.status ?? "Approved").charAt(0) +
                                (cal.status ?? "Approved")
                                  .slice(1)
                                  .toLowerCase()}
                            </div>
                          </div>
                        </div>

                        <AttendanceHeatmap
                          startDate={cal.startDate}
                          endDate={cal.endDate}
                          records={cal.allDays}
                          variant="dashboard"
                          emptyMessage="No start date available"
                          className="px-6 pb-5"
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/*  FORMS  */}
          {activeTab === "forms" && (
            <div className={`space-y-6 ${fade()}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-bold text-gray-900">All Forms</h2>
                <Button
                  onClick={() => setShowNewForm(true)}
                  className="h-9 rounded-lg text-sm bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Form
                </Button>
              </div>

              {!showNewForm && forms.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by company name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showNewForm ? (
                <InternshipForm
                  onBack={() => setShowNewForm(false)}
                  onSubmit={() => {
                    setShowNewForm(false);
                    fetchForms();
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {filteredForms.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        No forms found
                      </h3>
                      <p className="text-sm text-gray-500">
                        {forms.length === 0
                          ? "You haven't submitted any internship forms yet."
                          : "Try adjusting your search or filter criteria."}
                      </p>
                    </div>
                  ) : (
                    filteredForms.map((form) => (
                      <Card
                        key={form.id}
                        className="group border-gray-200 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-[9px] border border-gray-200 bg-[#fafafa] text-sm font-bold transition-colors duration-200 group-hover:border-gray-300 group-hover:bg-white ${getCompanyColor(form.companyName)}`}
                              >
                                {getInitials(form.companyName)}
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {form.companyName}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Teacher: {form.teacher.name} &middot;
                                  Submitted{" "}
                                  {new Date(
                                    form.createdAt,
                                  ).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              {approvalStatusBadge(form.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {form.companyLocation && (
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Location
                                </p>
                                <p className="font-medium text-gray-900">
                                  {form.companyLocation}
                                </p>
                              </div>
                            )}
                            {form.domain && (
                              <div>
                                <p className="text-gray-400 text-sm">Domain</p>
                                <p className="font-medium text-gray-900">
                                  {form.domain}
                                </p>
                              </div>
                            )}
                            {(form.startDate || form.endDate) && (
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Timeline
                                </p>
                                <p className="font-medium text-gray-900">
                                  {fmtDate(form.startDate)} -{" "}
                                  {fmtDate(form.endDate)}
                                </p>
                              </div>
                            )}
                            {form.durationWeeks && (
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Duration
                                </p>
                                <p className="font-medium text-gray-900">
                                  {form.durationWeeks} weeks
                                </p>
                              </div>
                            )}
                            {!form.durationWeeks &&
                              (form.startDate || form.endDate) && (
                                <div>
                                  <p className="text-gray-400 text-sm">
                                    Duration
                                  </p>
                                  <p className="font-medium text-gray-900">
                                    {durationBetween(
                                      form.startDate,
                                      form.endDate,
                                    )}
                                  </p>
                                </div>
                              )}
                            {form.mode && (
                              <div>
                                <p className="text-gray-400 text-sm">Mode</p>
                                <p className="font-medium text-gray-900 capitalize">
                                  {form.mode}
                                </p>
                              </div>
                            )}
                            {form.stipend && (
                              <div>
                                <p className="text-gray-400 text-sm">Stipend</p>
                                <p className="font-medium text-gray-900 capitalize">
                                  {form.stipend}
                                  {form.stipend === "paid" &&
                                  form.stipendAmount != null
                                    ? ` - INR ${form.stipendAmount.toLocaleString("en-IN")}/month`
                                    : ""}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-400 text-sm">
                                Coordinator
                              </p>
                              <p className="font-medium text-gray-900">
                                {form.teacher.name}
                              </p>
                              <p className="text-gray-500 break-all">
                                {form.teacher.email}
                              </p>
                            </div>
                            {form.hrEmail && (
                              <div>
                                <p className="text-gray-400 text-sm">
                                  HR Contact
                                </p>
                                <p className="font-medium text-gray-900 break-all">
                                  {form.hrEmail}
                                </p>
                              </div>
                            )}
                            {form.deptCoordinatorEmail && (
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Dept Coordinator
                                </p>
                                <p className="font-medium text-gray-900 break-all">
                                  {form.deptCoordinatorEmail}
                                </p>
                              </div>
                            )}
                          </div>

                          {form.status === "REJECTED" ? (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                              <p className="text-sm font-semibold text-red-700">
                                Rejection reason
                              </p>
                              <p className="mt-1 text-sm text-red-800">
                                {form.rejectionReason?.trim() ||
                                  "No rejection reason was saved for this form."}
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <span>
                                Attendance records: {form.attendances.length}
                              </span>
                              <span className="hidden sm:inline text-gray-300">
                                •
                              </span>
                              <span>
                                {form.isActive
                                  ? "Currently active"
                                  : form.status === "COMPLETED"
                                    ? "Internship completed"
                                    : "Not active"}
                              </span>
                            </div>

                            {form.offerLetterURL && (
                              <a
                                href={form.offerLetterURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                <FileText className="w-4 h-4" />
                                View Offer Letter
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/*  ATTENDANCE  */}
          {activeTab === "attendance" && (
            <div className={fade()}>
              <AttendanceTracker
                forms={attendanceForms}
                onAttendanceRequest={fetchForms}
                onSelectedCompanyChange={setSelectedAttendanceCompany}
              />
            </div>
          )}

          {/*  PROFILE  */}
          {activeTab === "profile" && (
            <div className={`space-y-6 ${fade()}`}>
              {/* Profile card */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Banner */}
                <div className="h-28 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="px-6 pb-6">
                  {/* Avatar overlapping banner */}
                  <div className="-mt-12 mb-4">
                    <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-white shadow-lg grid place-items-center text-2xl font-bold text-blue-600">
                      {userName ? getInitials(userName) : "??"}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {userName || "Student"}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {userProfile?.role === "STUDENT"
                      ? "Student"
                      : userProfile?.role || "Student"}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Account Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 grid place-items-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Full Name
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userName || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-50 grid place-items-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Email
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.email || "Not available"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 grid place-items-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Member Since
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.createdAt
                            ? new Date(
                                userProfile.createdAt,
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Details */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Academic Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-50 grid place-items-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Branch
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.branch || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-50 grid place-items-center flex-shrink-0">
                        <Users className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Division
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.division || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 grid place-items-center flex-shrink-0">
                        <GraduationCap className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          Role
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {userProfile?.role === "STUDENT"
                            ? "Student"
                            : userProfile?.role || "Student"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internship stats summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Internship Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-50/50">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.total}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Total Forms</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50/50">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.approved}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Approved</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-amber-50/50">
                    <p className="text-2xl font-bold text-amber-600">
                      {stats.pending}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Pending</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-violet-50/50">
                    <p className="text-2xl font-bold text-violet-600">
                      {stats.totalAttendance}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Attendance Days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
