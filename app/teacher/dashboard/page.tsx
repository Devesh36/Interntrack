"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Activity,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  Users,
} from "lucide-react";

interface InternshipFormData {
  id: string;
  companyName: string;
  studentName?: string | null;
  offerLetterURL?: string;
  deptCoordinatorEmail?: string | null;
  hrEmail?: string | null;
  companyLocation?: string | null;
  domain?: string | null;
  durationWeeks?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  stipend?: string | null;
  stipendAmount?: number | null;
  mode?: string | null;
  studentClass?: string | null;
  studentBranch?: string | null;
  studentDivision?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  student?: { id: string; name?: string | null; email?: string | null } | null;
  attendances?: Array<{ id: string; status: string; date: string }>;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  branch: string | null;
  division: string | null;
  createdAt: string;
}

const TeacherOverviewTab = dynamic(
  () =>
    import("@/components/teacher/teacher-overview-tab").then(
      (mod) => mod.TeacherOverviewTab,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full rounded-xl" /> },
);

const TeacherApprovalsTab = dynamic(
  () =>
    import("@/components/teacher/teacher-approvals-tab").then(
      (mod) => mod.TeacherApprovalsTab,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full rounded-xl" /> },
);

const TeacherStudentsTab = dynamic(
  () =>
    import("@/components/teacher/teacher-students-tab").then(
      (mod) => mod.TeacherStudentsTab,
    ),
  { loading: () => <Skeleton className="h-[420px] w-full rounded-xl" /> },
);

const AuditLogs = dynamic(
  () =>
    import("@/components/teacher/audit-logs-v2").then((mod) => mod.AuditLogs),
  { loading: () => <Skeleton className="h-[360px] w-full rounded-xl" /> },
);

const ManageDeptCoordinators = dynamic(
  () =>
    import("@/components/teacher/manage-deptCoordinator").then(
      (mod) => mod.ManageDeptCoordinators,
    ),
  { loading: () => <Skeleton className="h-[360px] w-full rounded-xl" /> },
);

const EmailReportsInfo = dynamic(
  () =>
    import("@/components/teacher/email-reports-info").then(
      (mod) => mod.EmailReportsInfo,
    ),
  { loading: () => <Skeleton className="h-[320px] w-full rounded-xl" /> },
);

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

function SectionIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-emerald-700">{label}</p>
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      {description ? (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      ) : null}
    </div>
  );
}

// loading skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200 h-14 flex items-center px-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </nav>
      <div className="flex">
        <aside className="hidden lg:block w-56 border-r border-gray-200 bg-white p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </aside>
        <main className="flex-1 p-7 space-y-6">
          <Skeleton className="h-7 w-60" />
          <Skeleton className="h-5 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[380px] rounded-xl" />
        </main>
      </div>
    </div>
  );
}

// ── inner dashboard (uses useSearchParams – must be inside a Suspense boundary) ──
function TeacherDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // tab key lives in the URL so browser back/forward and deep links just work
  const activeTab = searchParams.get("tab") ?? "overview";
  const setActiveTab = useCallback(
    (tab: string) => {
      router.replace(`/teacher/dashboard?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  const [forms, setForms] = useState<InternshipFormData[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const enableReportsEnv = process.env.NEXT_PUBLIC_ENABLE_REPORTS;
  const canViewReports =
    enableReportsEnv === undefined ? true : enableReportsEnv === "true";

  const fetchDashboardData = useCallback(async () => {
    try {
      const [formsRes, userRes] = await Promise.all([
        fetch("/api/internship-form", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);
      if (formsRes.ok) setForms(await formsRes.json());
      else toast.error("Could not load student forms.");
      if (userRes.ok) setUserProfile(await userRes.json());
      else toast.error("Could not load teacher profile.");
    } catch (err) {
      console.error("Failed to load teacher dashboard:", err);
      toast.error("Failed to load dashboard — a network error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load + mount animation trigger
  useEffect(() => {
    fetchDashboardData();
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    fetchDashboardData();
  }, [activeTab, fetchDashboardData]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed — redirecting to login...");
    } finally {
      router.push("/teacher/login");
      router.refresh();
    }
  };

  const stats = useMemo(
    () => ({
      total: forms.length,
      pending: forms.filter((f) => f.status === "PENDING").length,
      approved: forms.filter((f) => f.status === "APPROVED").length,
      rejected: forms.filter((f) => f.status === "REJECTED").length,
      totalAttendance: forms.reduce(
        (sum, f) =>
          sum + (Array.isArray(f.attendances) ? f.attendances.length : 0),
        0,
      ),
    }),
    [forms],
  );

  const pendingForms = useMemo(
    () => forms.filter((f) => f.status === "PENDING"),
    [forms],
  );

  const activeInternships = useMemo(
    () => forms.filter((f) => f.status === "APPROVED" && f.isActive),
    [forms],
  );

  const paidUnpaidRatio = useMemo(() => {
    const paid = forms.filter(
      (f) => (f.stipend || "").toLowerCase() === "paid",
    ).length;
    const unpaid = forms.filter(
      (f) => (f.stipend || "").toLowerCase() === "unpaid",
    ).length;
    return `${paid}:${unpaid}`;
  }, [forms]);

  const approvedLikeCount = useMemo(
    () =>
      forms.filter((f) => f.status === "APPROVED" || f.status === "COMPLETED")
        .length,
    [forms],
  );

  // last 5 months of submission counts for the bar chart
  const overviewMonths = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short" });

    const countMap = new Map<string, number>();
    forms.forEach((f) => {
      const d = new Date(f.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });

    const months = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (4 - i));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return { key, label: fmt.format(d), count: countMap.get(key) ?? 0 };
    });

    const max = Math.max(...months.map((m) => m.count), 1);
    return { months, max };
  }, [forms]);

  const teacherName = userProfile?.name || "Teacher";

  const sidebarLinks = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: LayoutGrid },
      {
        key: "approvals",
        label: "Approvals",
        icon: ShieldCheck,
        badge: stats.pending,
      },
      { key: "students", label: "Students", icon: GraduationCap },
      { key: "audit", label: "Audit Logs", icon: Activity },
      { key: "deptcoordinators", label: "Coordinators", icon: Users },
      ...(canViewReports
        ? [{ key: "reports", label: "Reports", icon: Mail }]
        : []),
    ],
    [canViewReports, stats.pending],
  );

  const fade = () =>
    `transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top navbar */}
      <nav className="sticky top-0 z-50 bg-[#fafafa]/90 backdrop-blur-xl border-b border-gray-200 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* mobile hamburger */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="w-9 h-9 rounded-lg hover:bg-gray-100 grid place-items-center transition-colors">
                  <Menu className="w-5 h-5 text-gray-700" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Teacher menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate between teacher dashboard sections.
                </SheetDescription>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-50 border-[1.5px] border-emerald-200 grid place-items-center text-sm font-bold text-emerald-700">
                      {getInitials(teacherName)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {teacherName}
                      </div>
                      <div className="text-xs text-gray-400">Teacher</div>
                    </div>
                  </div>
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
                          ? "bg-emerald-50 text-emerald-700 font-semibold"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <link.icon className="w-4 h-4 flex-shrink-0" />
                      {link.label}
                      {link.badge ? (
                        <span className="ml-auto bg-amber-50 text-amber-700 rounded-full text-[11px] font-bold px-1.5 py-px">
                          {link.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* app logo */}
          <div className="w-8 h-8 rounded-lg bg-gray-900 grid place-items-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-gray-900 leading-tight tracking-tight">
              Interntrack
            </span>
            <span className="text-xs text-gray-400 leading-none">
              Teacher Portal
            </span>
          </div>
        </div>

        {/* teacher identity + sign-out */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-emerald-50 border-[1.5px] border-emerald-200 grid place-items-center text-xs font-bold text-emerald-700">
              {getInitials(teacherName)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-700 leading-tight">
                {teacherName}
              </span>
              <span className="text-xs text-gray-400 leading-none">
                {userProfile?.email || "Teacher"}
              </span>
            </div>
          </div>
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
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 bg-white border-r border-gray-200 flex-col gap-0.5 p-3 sticky top-14 h-[calc(100vh-56px)]">
          {/* avatar */}
          <div className="px-2.5 py-2 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-50 border-[1.5px] border-emerald-200 grid place-items-center text-sm font-bold text-emerald-700">
                {getInitials(teacherName)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {teacherName}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {userProfile?.email || "teacher@college.edu"}
                </div>
              </div>
            </div>
          </div>

          <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-300 px-2.5 pt-2 pb-1.5">
            Menu
          </span>
          {sidebarLinks.map((link) => (
            <button
              key={link.key}
              onClick={() => setActiveTab(link.key)}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === link.key
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <link.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{link.label}</span>
              {link.badge ? (
                <span className="ml-auto bg-amber-50 text-amber-700 rounded-full text-[11px] font-bold px-1.5 py-px">
                  {link.badge}
                </span>
              ) : null}
            </button>
          ))}
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className={fade()}>
              <TeacherOverviewTab
                forms={forms}
                teacherName={teacherName}
                stats={stats}
                activeInternships={activeInternships}
                overviewMonths={overviewMonths}
                paidUnpaidRatio={paidUnpaidRatio}
                approvedLikeCount={approvedLikeCount}
                mounted={mounted}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          {/* Approvals  */}
          {activeTab === "approvals" && (
            <div className={fade()}>
              <TeacherApprovalsTab
                forms={pendingForms}
                onStatusChange={fetchDashboardData}
              />
            </div>
          )}

          {/* Students */}
          {activeTab === "students" && (
            <div className={fade()}>
              <TeacherStudentsTab forms={forms} />
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === "audit" && (
            <div className={`space-y-6 ${fade()}`}>
              <SectionIntro
                label="Audit Logs"
                title="Attendance verification activity"
                description="Review verification events and export logs."
              />
              <AuditLogs forms={forms} />
            </div>
          )}

          {/* Department Coordinators */}
          {activeTab === "deptcoordinators" && (
            <div className={`space-y-6 ${fade()}`}>
              <SectionIntro
                label="Coordinators"
                title="Department coordinator directory"
                description="Manage branch coordinator contacts."
              />
              <ManageDeptCoordinators />
            </div>
          )}

          {/* Reports */}
          {activeTab === "reports" && canViewReports && (
            <div className={`space-y-6 ${fade()}`}>
              <SectionIntro
                label="Reports"
                title="Automated attendance reporting"
                description="Review the schedule and trigger a report when needed."
              />
              <EmailReportsInfo />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Suspense wrapper required by Next.js when using useSearchParams
export default function TeacherDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TeacherDashboardInner />
    </Suspense>
  );
}
