"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BriefcaseBusiness,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  Search,
} from "lucide-react";

type StudentForm = {
  id: string;
  companyName: string;
  studentName?: string | null;
  offerLetterURL?: string;
  companyLocation?: string | null;
  stipend?: string | null;
  stipendAmount?: number | null;
  mode?: string | null;
  studentClass?: string | null;
  studentBranch?: string | null;
  studentDivision?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  startDate?: string | null;
  endDate?: string | null;
  student?: { id: string; name?: string | null; email?: string | null } | null;
  attendances?: Array<{ id: string; status: string; date: string }>;
};

interface TeacherStudentsTabProps {
  forms: StudentForm[];
}

const STUDENT_AVATAR_TONES = [
  "bg-[#e0ecff] text-[#2563eb]",
  "bg-[#dcfce7] text-[#16a34a]",
  "bg-[#ede9fe] text-[#7c3aed]",
  "bg-[#f3f4f6] text-[#6b7280]",
];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getFormStudentName = (form: StudentForm) =>
  form.studentName || form.student?.name || "Unknown Student";

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

const normalizeMode = (value?: string | null) => {
  if (!value) return "Not specified";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const getActivityLabel = (form: StudentForm) => {
  if (form.status === "COMPLETED") return "Completed";
  if (form.status !== "APPROVED") return "Not Active";
  const now = new Date();
  const startDate = form.startDate ? new Date(form.startDate) : null;
  const endDate = form.endDate ? new Date(form.endDate) : null;
  if (startDate && now < startDate) return "Starts Soon";
  if (endDate && now > endDate) return "Ended";
  return form.isActive ? "Active" : "Inactive";
};

const getStudentCardStatus = (form: StudentForm) => {
  if (form.status === "PENDING") {
    return { label: "Pending", tone: "bg-amber-50 text-amber-600" };
  }
  if (getActivityLabel(form) === "Active") {
    return { label: "Active", tone: "bg-green-50 text-green-600" };
  }
  if (form.status === "COMPLETED") {
    return { label: "Completed", tone: "bg-violet-50 text-violet-600" };
  }
  if (form.status === "REJECTED") {
    return { label: "Rejected", tone: "bg-red-50 text-red-600" };
  }
  return { label: "Approved", tone: "bg-blue-50 text-blue-600" };
};

const getStudentStipendLabel = (form: StudentForm) => {
  const stipendType = (form.stipend || "").toLowerCase();
  if (stipendType === "paid" && typeof form.stipendAmount === "number") {
    return `INR ${form.stipendAmount.toLocaleString("en-IN")} / mo`;
  }
  if (stipendType === "paid") return "Paid stipend";
  if (stipendType === "unpaid") return "Unpaid";
  return "Stipend not set";
};

const getStudentAvatarTone = (seed: string) => {
  const index =
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    STUDENT_AVATAR_TONES.length;
  return STUDENT_AVATAR_TONES[index];
};

const toolbarControlBaseClass =
  "rounded-[9px] border border-[#e4e6ea] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors";

const toolbarSelectTriggerClass = cn(
  toolbarControlBaseClass,
  "h-9 w-[160px] shrink-0 text-sm text-[#3a3d45] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff4ff] focus:ring-offset-0 data-[state=open]:border-[#2563eb] data-[state=open]:ring-4 data-[state=open]:ring-[#eff4ff] data-[state=open]:ring-offset-0",
);

export function TeacherStudentsTab({ forms }: TeacherStudentsTabProps) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatus, setStudentStatus] = useState("all");
  const [studentMode, setStudentMode] = useState("");
  const [studentSort, setStudentSort] = useState("newest");

  const studentBaseResults = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return forms.filter((form) => {
      const matchesSearch =
        query.length === 0 ||
        getFormStudentName(form).toLowerCase().includes(query) ||
        form.companyName.toLowerCase().includes(query) ||
        (form.student?.email || "").toLowerCase().includes(query);
      const matchesMode =
        !studentMode ||
        (form.mode || "").toLowerCase() === studentMode.toLowerCase();
      return matchesSearch && matchesMode;
    });
  }, [forms, studentMode, studentSearch]);

  const studentCounts = useMemo(
    () => ({
      all: studentBaseResults.length,
      active: studentBaseResults.filter(
        (form) => getStudentCardStatus(form).label === "Active",
      ).length,
      pending: studentBaseResults.filter((form) => form.status === "PENDING")
        .length,
      completed: studentBaseResults.filter(
        (form) => form.status === "COMPLETED",
      ).length,
      rejected: studentBaseResults.filter((form) => form.status === "REJECTED")
        .length,
    }),
    [studentBaseResults],
  );

  const filteredStudents = useMemo(() => {
    const result = studentBaseResults.filter((form) => {
      if (studentStatus === "all") return true;
      if (studentStatus === "active") {
        return getStudentCardStatus(form).label === "Active";
      }
      return form.status.toLowerCase() === studentStatus;
    });

    return [...result].sort((left, right) => {
      if (studentSort === "oldest") {
        return (
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
        );
      }
      if (studentSort === "name") {
        return getFormStudentName(left).localeCompare(
          getFormStudentName(right),
        );
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }, [studentBaseResults, studentSort, studentStatus]);

  const assignedStudentCount = useMemo(
    () =>
      new Set(forms.map((form) => form.student?.id || getFormStudentName(form)))
        .size,
    [forms],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs text-[#b4b8c2]">
              <span>Dashboard</span>
              <span className="text-[#c9cdd6]">/</span>
              <span>Students</span>
            </div>
            <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#0d1117]">
              Internship management
            </h2>
            <p className="mt-1 text-sm text-[#7f8491]">
              {assignedStudentCount} student
              {assignedStudentCount === 1 ? "" : "s"} assigned to you across{" "}
              {forms.length} internship{forms.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-1 rounded-[10px] border border-[#e4e6ea] bg-white p-1">
          {[
            { id: "all", label: "All", count: studentCounts.all },
            { id: "active", label: "Active", count: studentCounts.active },
            { id: "pending", label: "Pending", count: studentCounts.pending },
            {
              id: "completed",
              label: "Completed",
              count: studentCounts.completed,
            },
            {
              id: "rejected",
              label: "Rejected",
              count: studentCounts.rejected,
            },
          ].map((tab) => {
            const active = studentStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStudentStatus(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3.5 py-2 text-sm font-medium text-[#7f8491] transition-all duration-150 hover:bg-[#f5f6f8] hover:text-[#3a3d45]",
                  active &&
                    "bg-[#0d1117] font-semibold text-white hover:bg-[#0d1117] hover:text-white",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full bg-[#f5f6f8] px-2 py-0.5 text-xs font-bold text-[#7f8491]",
                    active && "bg-white/20 text-white",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <div
            className={cn(
              toolbarControlBaseClass,
              "flex h-9 min-w-[260px] flex-1 items-center gap-2 px-3 focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#eff4ff]",
            )}
          >
            <Search className="h-3.5 w-3.5 text-[#b4b8c2]" />
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search by name, company, or email..."
              className="w-full bg-transparent text-sm text-[#0d1117] outline-none placeholder:text-[#b4b8c2]"
            />
          </div>

          <Select
            value={studentMode || "all"}
            onValueChange={(value) =>
              setStudentMode(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className={toolbarSelectTriggerClass}>
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={studentSort} onValueChange={setStudentSort}>
            <SelectTrigger className={toolbarSelectTriggerClass}>
              <SelectValue placeholder="Newest first" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>

          <p className="ml-auto shrink-0 whitespace-nowrap text-sm text-[#b4b8c2]">
            {filteredStudents.length} result
            {filteredStudents.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {filteredStudents.length === 0 ? (
          <Card className="rounded-[13px] border border-[#e4e6ea] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <CardContent className="p-14 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#f5f6f8]">
                <GraduationCap className="h-5 w-5 text-[#b4b8c2]" />
              </div>
              <p className="text-sm font-semibold text-[#7f8491]">
                No students match
              </p>
              <p className="mt-1 text-sm text-[#b4b8c2]">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((form) => {
            const statusMeta = getStudentCardStatus(form);
            const avatarTone = getStudentAvatarTone(getFormStudentName(form));
            const chips = [
              {
                key: "company",
                icon: <BriefcaseBusiness className="h-3 w-3 text-[#b4b8c2]" />,
                label: form.companyName,
                tone: "",
              },
              {
                key: "location",
                icon: <MapPin className="h-3 w-3 text-[#b4b8c2]" />,
                label: form.companyLocation || "Location not set",
                tone: "",
              },
              {
                key: "mode",
                icon: <Clock className="h-3 w-3 text-[#b4b8c2]" />,
                label: normalizeMode(form.mode),
                tone: "",
              },
              {
                key: "timeline",
                icon: <FileText className="h-3 w-3 text-[#b4b8c2]" />,
                label: `${fmtDate(form.startDate)} - ${fmtDate(form.endDate)}`,
                tone: "",
              },
              {
                key: "education",
                icon: null,
                label: `${form.studentClass || "-"} - ${
                  form.studentBranch || "-"
                } - ${
                  form.studentDivision
                    ? `Division ${form.studentDivision}`
                    : "No division"
                }`,
                tone: "",
              },
              {
                key: "stipend",
                icon: null,
                label: getStudentStipendLabel(form),
                tone: "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]",
              },
            ];

            return (
              <Card
                key={form.id}
                className="cursor-pointer rounded-[13px] border border-[#e4e6ea] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c9cdd6] hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
              >
                <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                  <div
                    className={cn(
                      "flex h-[42px] w-[42px] items-center justify-center rounded-xl text-sm font-bold tracking-[-0.01em]",
                      avatarTone,
                    )}
                  >
                    {getInitials(getFormStudentName(form))}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold tracking-[-0.01em] text-[#0d1117]">
                        {getFormStudentName(form)}
                      </span>
                      <span className="text-sm text-[#b4b8c2]">
                        {form.student?.email || "No student email available"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {chips.map((chip) => (
                        <span
                          key={`${form.id}-${chip.key}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-[6px] border border-[#e4e6ea] bg-[#f5f6f8] px-2.5 py-1 text-xs font-medium text-[#7f8491]",
                            chip.tone,
                          )}
                        >
                          {chip.icon}
                          <span>{chip.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusMeta.tone,
                      )}
                    >
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      {statusMeta.label}
                    </span>

                    {form.offerLetterURL ? (
                      <a
                        href={form.offerLetterURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-[7px] border border-[#e4e6ea] px-3 py-1.5 text-xs font-medium text-[#7f8491] transition-all duration-150 hover:border-[rgba(37,99,235,0.2)] hover:bg-[#eff4ff] hover:text-[#2563eb]"
                      >
                        <FileText className="h-3 w-3" />
                        Offer letter
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
