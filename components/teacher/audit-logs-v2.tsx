"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceHeatmap } from "@/components/student/attendance-heatmap";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  ChevronUp,
  ChevronDown,
  MapPin,
  Monitor,
  Clock,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface VerificationLog {
  id: string;
  ipAddress: string;
  location: string | null;
  userAgent: string | null;
  action: string;
  timestamp: string;
  attendance: {
    student: { name: string; email: string };
    internshipForm: { companyName: string };
  };
}

interface InternshipForm {
  id: string;
  studentName?: string | null;
  student?: { id: string; name?: string | null; email?: string | null } | null;
  companyName: string;
  startDate?: string | null;
  endDate?: string | null;
  email?: string | null;
}

interface AuditLogsProps {
  forms: InternshipForm[];
}

const getFormStudentName = (form: InternshipForm) =>
  form.studentName || form.student?.name || "Unknown Student";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const AVATAR_TONES = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
];

function avatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

/* Grouping logs by student email */
interface StudentGroup {
  email: string;
  name: string;
  company: string;
  logs: VerificationLog[];
  presentCount: number;
  absentCount: number;
}

function groupByStudent(logs: VerificationLog[]): StudentGroup[] {
  const map = new Map<string, StudentGroup>();
  for (const log of logs) {
    const email = log.attendance.student.email;
    let group = map.get(email);
    if (!group) {
      group = {
        email,
        name: log.attendance.student.name,
        company: log.attendance.internshipForm.companyName,
        logs: [],
        presentCount: 0,
        absentCount: 0,
      };
      map.set(email, group);
    }
    group.logs.push(log);
    if (log.action === "present") group.presentCount++;
    else group.absentCount++;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function useStaggerReveal(
  mounted: boolean,
  count: number,
  baseDelay = 40,
  step = 70,
) {
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array(count).fill(false),
  );

  useEffect(() => {
    if (!mounted) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(
          () => {
            setRevealed((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          },
          baseDelay + i * step,
        ),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [mounted, count, baseDelay, step]);

  return revealed;
}

export function AuditLogs({ forms }: AuditLogsProps) {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LOGS_PER_PAGE = 10;

  /* Reset page when filters change */
  const handleStudentChange = (val: string) => {
    setSelectedStudent(val);
    setPage(1);
  };
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  /*  Fetch logs  */
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStudent !== "all") params.set("studentId", selectedStudent);
      params.set("page", String(page));
      params.set("limit", String(LOGS_PER_PAGE));

      const resp = await fetch(`/api/logs?${params}`);
      if (resp.ok) {
        const data = await resp.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
      } else {
        toast.error("Could not load verification logs.");
      }
    } catch {
      toast.error("Failed to load logs — network error.");
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /*  Unique students for dropdown  */
  const uniqueStudents = useMemo(
    () =>
      forms
        .filter((f) => f.student?.id)
        .reduce<Array<{ id: string; name: string }>>((acc, f) => {
          if (!acc.some((e) => e.id === f.student?.id))
            acc.push({ id: f.student!.id, name: getFormStudentName(f) });
          return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name)),
    [forms],
  );

  /*  Groups and search filter  */
  const groups = useMemo(() => {
    const all = groupByStudent(logs);
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.company.toLowerCase().includes(q),
    );
  }, [logs, search]);

  /*  Stats  */
  const stats = useMemo(() => {
    const present = logs.filter((l) => l.action === "present").length;
    const absent = logs.length - present;
    const students = new Set(logs.map((l) => l.attendance.student.email)).size;
    return { total: logs.length, present, absent, students };
  }, [logs]);

  const staggerRevealed = useStaggerReveal(
    mounted && !loading,
    groups.length + 2,
  );

  /*  CSV Export  */
  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      "Student Name",
      "Student Email",
      "Company",
      "Action",
      "IP Address",
      "Location",
      "User Agent",
      "Timestamp",
    ];
    const rows = [headers.join(",")];
    for (const row of logs) {
      rows.push(
        [
          `"${row.attendance.student.name}"`,
          `"${row.attendance.student.email}"`,
          `"${row.attendance.internshipForm.companyName}"`,
          `"${row.action}"`,
          `"${row.ipAddress}"`,
          `"${row.location ?? ""}"`,
          `"${row.userAgent ?? ""}"`,
          `"${new Date(row.timestamp).toISOString()}"`,
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interntrack-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /*  Heatmap helpers  */
  function getHeatmapDates(group: StudentGroup) {
    const studentForm = forms.find(
      (f) => f.student?.email === group.email || f.studentName === group.name,
    );
    const fb = new Date();
    fb.setDate(fb.getDate() - 30);
    return {
      start: studentForm?.startDate
        ? new Date(studentForm.startDate).toISOString()
        : fb.toISOString(),
      end: studentForm?.endDate
        ? new Date(studentForm.endDate).toISOString()
        : new Date().toISOString(),
    };
  }

  function getHeatmapRecords(group: StudentGroup) {
    return group.logs.map((l) => ({
      date: new Date(l.timestamp).toISOString(),
      status: (l.action === "present" ? "present" : "absent") as
        | "present"
        | "absent"
        | "pending"
        | "none",
    }));
  }

  return (
    <div className="space-y-5">
      {/*  Toolbar  */}
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all duration-300 ease-out",
          staggerRevealed[0]
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedStudent} onValueChange={handleStudentChange}>
            <SelectTrigger className="w-full sm:w-[240px] h-9 rounded-[9px] border-[#e4e6ea] bg-white text-[12.5px] text-[#3a3d45] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <SelectValue placeholder="Filter by student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {uniqueStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-[9px] border border-[#e4e6ea] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#eff4ff]">
            <Search className="h-3.5 w-3.5 text-[#b4b8c2]" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email or company..."
              className="w-full bg-transparent text-[13px] text-[#0d1117] outline-none placeholder:text-[#b4b8c2]"
            />
          </div>

          <div className="inline-flex items-center gap-1 bg-[#f5f6f8] border border-[#e4e6ea] rounded-[6px] px-2 py-1 text-[11.5px] font-medium text-[#7f8491]">
            <FileText className="w-[11px] h-[11px] text-[#b4b8c2]" />
            {logs.length} entries
          </div>
        </div>

        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] text-[12.5px] font-medium bg-transparent text-[#3a3d45] border border-[#c9cdd6] hover:bg-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Loading  */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#e4e6ea] border-t-[#16a34a] animate-spin" />
          <p className="text-[13px] text-[#7f8491] font-medium">
            Loading verification logs...
          </p>
        </div>
      ) : groups.length === 0 ? (
        /*  Empty state  */
        <div className="rounded-[13px] border border-[#e4e6ea] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f5f6f8] grid place-items-center mb-4">
              <ShieldCheck className="w-6 h-6 text-[#b4b8c2]" />
            </div>
            <h3 className="text-[15px] font-bold tracking-[-0.02em] text-[#0d1117] mb-1">
              No verification logs
            </h3>
            <p className="text-[13px] text-[#7f8491] max-w-xs">
              {search
                ? "No results match your search. Try a different keyword."
                : "Attendance verification logs will appear here once students start marking attendance."}
            </p>
          </div>
        </div>
      ) : (
        /*  Student groups  */
        <div className="flex flex-col gap-3">
          {groups.map((group, gIdx) => {
            const isExpanded = expandedEmail === group.email;
            const heatmapDates = getHeatmapDates(group);
            const heatmapRecords = getHeatmapRecords(group);

            return (
              <div
                key={group.email}
                className={cn(
                  "rounded-[13px] border bg-white transition-all duration-[time:380ms] ease-out",
                  isExpanded
                    ? "border-[#16a34a] shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                    : "border-[#e4e6ea] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#c9cdd6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]",
                  staggerRevealed[gIdx + 2]
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3",
                )}
              >
                {/*  Group header  */}
                <button
                  onClick={() =>
                    setExpandedEmail(isExpanded ? null : group.email)
                  }
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 rounded-[13px]"
                >
                  {/* avatar */}
                  <div
                    className={cn(
                      "flex h-[42px] w-[42px] items-center justify-center rounded-xl text-[13px] font-bold tracking-[-0.01em] border shrink-0",
                      avatarTone(group.name),
                    )}
                  >
                    {getInitials(group.name)}
                  </div>

                  {/* info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold tracking-[-0.01em] text-[#0d1117]">
                        {group.name}
                      </span>
                      <span className="text-[11.5px] text-[#b4b8c2] truncate">
                        {group.email}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-[#f5f6f8] border border-[#e4e6ea] rounded-[6px] px-2 py-0.5 text-[11.5px] font-medium text-[#7f8491]">
                        {group.company}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[11px] font-semibold bg-[#f0fdf4] text-[#16a34a]">
                        <span className="h-[5px] w-[5px] rounded-full bg-current" />
                        {group.presentCount} Present
                      </span>
                      {group.absentCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[11px] font-semibold bg-[#fef2f2] text-[#dc2626]">
                          <span className="h-[5px] w-[5px] rounded-full bg-current" />
                          {group.absentCount} Absent
                        </span>
                      )}
                      <span className="text-[11px] text-[#b4b8c2]">
                        {group.logs.length} total
                      </span>
                    </div>
                  </div>

                  {/* chevron */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#b4b8c2] shrink-0 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#b4b8c2] shrink-0 transition-transform duration-200" />
                  )}
                </button>

                {/*  Expanded content  */}
                {isExpanded && (
                  <div className="border-t border-[#e4e6ea] bg-[#f5f6f8]/50 rounded-b-[13px] px-5 py-5 space-y-5">
                    {/* Heatmap */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b4b8c2] mb-3">
                        Attendance Heatmap
                      </p>
                      <div className="bg-white rounded-xl border border-[#e4e6ea] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                        <AttendanceHeatmap
                          variant="dashboard"
                          startDate={heatmapDates.start}
                          endDate={heatmapDates.end}
                          records={heatmapRecords}
                        />
                      </div>
                    </div>

                    {/* Log table */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b4b8c2] mb-3">
                        Verification Details
                      </p>
                      <div className="bg-white rounded-xl border border-[#e4e6ea] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                        {/* table header */}
                        <div className="hidden md:grid grid-cols-[1fr_90px_140px_1fr_140px] gap-3 px-4 py-2.5 bg-[#f5f6f8] border-b border-[#e4e6ea] text-[10px] font-bold uppercase tracking-[0.1em] text-[#b4b8c2]">
                          <span>Date</span>
                          <span>Status</span>
                          <span>IP Address</span>
                          <span>Location</span>
                          <span>Time</span>
                        </div>
                        {/* rows */}
                        {group.logs.map((log, lIdx) => {
                          const isPresent = log.action === "present";
                          return (
                            <div
                              key={log.id}
                              className={cn(
                                "grid grid-cols-1 gap-1 md:grid-cols-[1fr_90px_140px_1fr_140px] md:gap-3 items-center px-4 py-3 text-[13px] transition-colors hover:bg-[#f5f6f8]/70",
                                lIdx < group.logs.length - 1 &&
                                  "border-b border-[#e4e6ea]",
                              )}
                            >
                              {/* date */}
                              <div className="flex items-center gap-2 text-[#0d1117] font-medium">
                                <Clock className="w-3.5 h-3.5 text-[#b4b8c2] shrink-0 hidden md:block" />
                                {new Date(log.timestamp).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                              {/* status */}
                              <div>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-[9px] py-[3px] text-[11px] font-semibold",
                                    isPresent
                                      ? "bg-[#f0fdf4] text-[#16a34a]"
                                      : "bg-[#fef2f2] text-[#dc2626]",
                                  )}
                                >
                                  <span className="h-[5px] w-[5px] rounded-full bg-current" />
                                  {log.action.charAt(0).toUpperCase() +
                                    log.action.slice(1)}
                                </span>
                              </div>
                              {/* ip */}
                              <div className="flex items-center gap-1.5 text-[#3a3d45]">
                                <Monitor className="w-3.5 h-3.5 text-[#b4b8c2] shrink-0 hidden md:block" />
                                <span className="font-mono text-[12px]">
                                  {log.ipAddress}
                                </span>
                              </div>
                              {/* location */}
                              <div className="flex items-center gap-1.5 text-[#3a3d45]">
                                <MapPin className="w-3.5 h-3.5 text-[#b4b8c2] shrink-0 hidden md:block" />
                                <span className="truncate">
                                  {log.location || "Unknown"}
                                </span>
                              </div>
                              {/* time */}
                              <div className="text-[#7f8491] text-[12px]">
                                {new Date(log.timestamp).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* user (collapsed) */}
                    {group.logs.some((l) => l.userAgent) && (
                      <details className="group">
                        <summary className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b4b8c2] cursor-pointer hover:text-[#7f8491] transition-colors">
                          User Agent Details
                        </summary>
                        <div className="mt-2 bg-white rounded-xl border border-[#e4e6ea] p-3 space-y-2">
                          {group.logs
                            .filter((l) => l.userAgent)
                            .slice(0, 3)
                            .map((l) => (
                              <p
                                key={l.id}
                                className="text-[11px] text-[#7f8491] break-all leading-relaxed"
                              >
                                <span className="font-semibold text-[#3a3d45]">
                                  {new Date(l.timestamp).toLocaleDateString()}:
                                </span>{" "}
                                {l.userAgent}
                              </p>
                            ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "cursor-pointer",
                  page === 1 && "pointer-events-none opacity-40",
                )}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("ellipsis");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`e-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      onClick={() => setPage(item)}
                      isActive={page === item}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  "cursor-pointer",
                  page === totalPages && "pointer-events-none opacity-40",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
