"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Mail,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ApprovalFormData {
  id: string;
  companyName: string;
  studentName?: string | null;
  offerLetterURL?: string | null;
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
  rejectionReason?: string | null;
  status: string;
  createdAt: string;
  student?: { id?: string; name?: string | null; email?: string | null } | null;
}

interface TeacherApprovalsTabProps {
  forms: ApprovalFormData[];
  onStatusChange: () => Promise<void> | void;
}

type UrgencyLevel = "fresh" | "waiting" | "urgent" | "overdue";

const URGENCY_STYLES: Record<
  UrgencyLevel,
  {
    card: string;
    top: string;
    logo: string;
    tag: string;
    dot: string;
  }
> = {
  fresh: {
    card: "",
    top: "bg-[linear-gradient(135deg,#f0f6ff_0%,#ffffff_62%)]",
    logo: "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]",
    tag: "text-[#2563eb]",
    dot: "bg-[#2563eb]",
  },
  waiting: {
    card: "",
    top: "bg-[linear-gradient(135deg,#fffdf0_0%,#ffffff_62%)]",
    logo: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]",
    tag: "text-[#d97706]",
    dot: "bg-[#d97706]",
  },
  urgent: {
    card: "",
    top: "",
    logo: "border-[#fed7aa] bg-[#fff0e6] text-[#ea580c]",
    tag: "text-[#ea580c]",
    dot: "bg-[#ea580c]",
  },
  overdue: {
    card: "",
    top: "bg-[linear-gradient(135deg,#fff0f0_0%,#ffffff_62%)]",
    logo: "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]",
    tag: "text-[#dc2626]",
    dot: "bg-[#dc2626]",
  },
};

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const parseDateValue = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
};

const formatFallback = (value?: string | null, fallback = "Not provided") =>
  value?.trim() ? value.trim() : fallback;

const formatStudentName = (form: ApprovalFormData) =>
  formatFallback(form.studentName || form.student?.name, "Unknown Student");

const formatStudentEmail = (form: ApprovalFormData) =>
  formatFallback(form.student?.email, "No email available");

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDisplayDate = (value?: string | null, pattern = "MMM d, yyyy") => {
  const parsed = parseDateValue(value);
  return parsed ? format(parsed, pattern) : "-";
};

const formatDisplayTime = (value?: string | null) => {
  const parsed = parseDateValue(value);
  return parsed ? format(parsed, "hh:mm a") : "-";
};

const getDurationLabel = (form: ApprovalFormData) => {
  const weeks = form.durationWeeks;
  if (typeof weeks === "number" && Number.isFinite(weeks) && weeks > 0) {
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const start = parseDateValue(form.startDate);
  const end = parseDateValue(form.endDate);
  if (start && end) {
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return "Duration not available";
};

const getTimelineSummary = (form: ApprovalFormData) => {
  const start = parseDateValue(form.startDate);
  const end = parseDateValue(form.endDate);
  const durationLabel = getDurationLabel(form);

  if (start && end) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d")} (${durationLabel})`;
  }

  if (start) {
    return `Starts ${format(start, "MMM d, yyyy")} (${durationLabel})`;
  }

  if (end) {
    return `Ends ${format(end, "MMM d, yyyy")} (${durationLabel})`;
  }

  return durationLabel;
};

const getUrgencyMeta = (createdAt: string) => {
  const created = parseDateValue(createdAt);
  if (!created) {
    return {
      level: "waiting" as UrgencyLevel,
      label: "Submitted recently",
      daysWaiting: null,
    };
  }

  const daysWaiting = Math.max(
    0,
    differenceInCalendarDays(
      startOfLocalDay(new Date()),
      startOfLocalDay(created),
    ),
  );

  if (daysWaiting <= 2) {
    return {
      level: "fresh" as UrgencyLevel,
      label:
        daysWaiting === 0
          ? "Submitted today"
          : `Submitted ${daysWaiting} day${daysWaiting === 1 ? "" : "s"} ago`,
      daysWaiting,
    };
  }

  if (daysWaiting <= 6) {
    return {
      level: "waiting" as UrgencyLevel,
      label: `Waiting ${daysWaiting} days`,
      daysWaiting,
    };
  }

  if (daysWaiting <= 13) {
    return {
      level: "urgent" as UrgencyLevel,
      label: `Urgent - ${daysWaiting} days`,
      daysWaiting,
    };
  }

  return {
    level: "overdue" as UrgencyLevel,
    label: `Overdue - ${daysWaiting} days`,
    daysWaiting,
  };
};

const normalizeMode = (value?: string | null) => {
  if (!value) return "Not specified";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const normalizeDivision = (value?: string | null) => {
  if (!value?.trim()) return "Division not set";
  return value.toLowerCase().startsWith("division")
    ? value
    : `Division ${value}`;
};

const normalizeStipend = (form: ApprovalFormData) => {
  const stipendType = form.stipend?.trim().toLowerCase();

  if (stipendType === "paid") {
    if (typeof form.stipendAmount === "number" && form.stipendAmount >= 0) {
      return {
        label: "Paid",
        amount: `INR ${form.stipendAmount.toLocaleString("en-IN")}`,
      };
    }

    return { label: "Paid", amount: "Amount not specified" };
  }

  if (stipendType === "unpaid") {
    return { label: "Unpaid", amount: "No stipend" };
  }

  return { label: "Not specified", amount: "Stipend details unavailable" };
};

const isEmail = (value?: string | null) =>
  Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));

const isExternalUrl = (value?: string | null) => {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>
      {children}
    </div>
  );
}

export function TeacherApprovalsTab({
  forms, // all pending forms, unfiltered
  onStatusChange,
}: TeacherApprovalsTabProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingForm, setRejectingForm] = useState<ApprovalFormData | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingFormId, setLoadingFormId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "APPROVED" | "REJECTED" | null
  >(null);

  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalBranch, setApprovalBranch] = useState("ALL");
  const [approvalDivision, setApprovalDivision] = useState("ALL");
  const [approvalMode, setApprovalMode] = useState("ALL");

  const allBranches = useMemo(
    () =>
      Array.from(
        new Set(
          forms
            .map((f) => f.studentBranch?.trim())
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [forms],
  );
  const allDivisions = useMemo(
    () =>
      Array.from(
        new Set(
          forms
            .map((f) => f.studentDivision?.trim())
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [forms],
  );
  const allModes = useMemo(
    () =>
      Array.from(
        new Set(
          forms
            .map((f) => f.mode?.trim().toLowerCase())
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [forms],
  );

  // apply all active filters to the full pending list
  const filteredForms = useMemo(
    () =>
      forms.filter((form) => {
        const query = approvalSearch.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          formatStudentName(form).toLowerCase().includes(query) ||
          form.companyName.toLowerCase().includes(query);
        const matchesBranch =
          approvalBranch === "ALL" || form.studentBranch === approvalBranch;
        const matchesDivision =
          approvalDivision === "ALL" ||
          form.studentDivision === approvalDivision;
        const matchesMode =
          approvalMode === "ALL" ||
          (form.mode || "").toLowerCase() === approvalMode.toLowerCase();
        return matchesSearch && matchesBranch && matchesDivision && matchesMode;
      }),
    [forms, approvalSearch, approvalBranch, approvalDivision, approvalMode],
  );

  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // reset to page 1 whenever filters narrow the results
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredForms]);

  const totalPages = Math.max(1, Math.ceil(filteredForms.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedForms = filteredForms.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const hasActiveFilters =
    approvalSearch.trim().length > 0 ||
    approvalBranch !== "ALL" ||
    approvalDivision !== "ALL" ||
    approvalMode !== "ALL";

  const normalizedRejectionReason = rejectionReason.trim();

  const handleStatusChange = async (
    formId: string,
    status: "APPROVED" | "REJECTED",
    rejectionReasonValue?: string,
  ) => {
    setLoadingFormId(formId);
    setLoadingAction(status);

    try {
      const response = await fetch(`/api/internship-form/${formId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED"
            ? { rejectionReason: rejectionReasonValue }
            : {}),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update approval status.");
      }

      toast.success(
        status === "APPROVED"
          ? "Internship form approved successfully."
          : "Internship form rejected successfully.",
      );
      await onStatusChange();
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "A network error occurred. Please try again.";
      toast.error(message);
      return false;
    } finally {
      setLoadingFormId(null);
      setLoadingAction(null);
    }
  };

  const openRejectDialog = (form: ApprovalFormData) => {
    setRejectingForm(form);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = (open: boolean) => {
    if (loadingAction === "REJECTED") return;
    setRejectDialogOpen(open);

    if (!open) {
      setRejectingForm(null);
      setRejectionReason("");
    }
  };

  const submitRejection = async () => {
    if (!rejectingForm) return;
    if (!normalizedRejectionReason) {
      toast.error("Please enter a rejection reason.");
      return;
    }

    const success = await handleStatusChange(
      rejectingForm.id,
      "REJECTED",
      normalizedRejectionReason,
    );

    if (success) {
      closeRejectDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                <span>Teacher Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium text-gray-700">Approvals</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#111318]">
                Review queue
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Filter pending forms and respond inline.
              </p>
            </div>

            {/* shows how many results survived the current filters */}
            <div className="inline-flex w-fit items-center rounded-full border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-sm font-semibold text-[#d97706]">
              {filteredForms.length} of {forms.length} pending form
              {forms.length === 1 ? "" : "s"} shown
            </div>
          </div>

          <Card className="border-[#e3e5ea] shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.8fr))_auto] xl:items-center">
                <div className="relative xl:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                    placeholder="Search by student or company"
                    className="h-11 border-[#e3e5ea] bg-[#f6f7f9] pl-10 text-[13px] shadow-none"
                    aria-label="Search pending forms by student or company"
                  />
                </div>

                <Select
                  value={approvalBranch}
                  onValueChange={setApprovalBranch}
                >
                  <SelectTrigger className="h-11 border-[#e3e5ea] bg-[#f6f7f9] text-[13px] shadow-none">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All branches</SelectItem>
                    {allBranches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={approvalDivision}
                  onValueChange={setApprovalDivision}
                >
                  <SelectTrigger className="h-11 border-[#e3e5ea] bg-[#f6f7f9] text-[13px] shadow-none">
                    <SelectValue placeholder="All divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All divisions</SelectItem>
                    {allDivisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {normalizeDivision(division)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={approvalMode} onValueChange={setApprovalMode}>
                  <SelectTrigger className="h-11 border-[#e3e5ea] bg-[#f6f7f9] text-[13px] shadow-none">
                    <SelectValue placeholder="All modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All modes</SelectItem>
                    {allModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {normalizeMode(mode)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm font-semibold text-[#d97706] xl:justify-self-end">
                  {filteredForms.length} result
                  {filteredForms.length === 1 ? "" : "s"}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            {[
              { label: "Fresh (0-2 days)", tone: "bg-[#2563eb]" },
              { label: "Waiting (3-6 days)", tone: "bg-[#d97706]" },
              { label: "Urgent (7-13 days)", tone: "bg-[#ea580c]" },
              { label: "Overdue (14+ days)", tone: "bg-[#dc2626]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", item.tone)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* all-clear: no pending forms at all */}
        {forms.length === 0 ? (
          <Card className="border-[#e3e5ea] shadow-sm">
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-[#111318]">
                No pending approvals
              </p>
              <p className="mt-2 text-sm text-gray-500">
                All caught up. New submissions will appear here automatically.
              </p>
            </CardContent>
          </Card>
        ) : filteredForms.length === 0 ? (
          // filters are active but nothing matched
          <Card className="border-[#e3e5ea] shadow-sm">
            <CardContent className="py-16 text-center">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-[#111318]">
                No forms match these approval filters
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {hasActiveFilters
                  ? "Try clearing a filter or search term to see more pending forms."
                  : "No pending forms are available right now."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedForms.map((form, index) => {
              const urgency = getUrgencyMeta(form.createdAt);
              const styles = URGENCY_STYLES[urgency.level];
              const stipend = normalizeStipend(form);
              const isLoading = loadingFormId === form.id;
              const timelineSummary = getTimelineSummary(form);
              const stipendSummary =
                stipend.label === "Paid"
                  ? `${stipend.amount}/month`
                  : stipend.amount;

              return (
                <article
                  key={form.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border border-[#e3e5ea] bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(0,0,0,0.06)]",
                    styles.card,
                  )}
                  style={{ transitionDelay: `${index * 35}ms` }}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-4 border-b border-[#e3e5ea] px-5 py-4 lg:flex-row lg:items-center lg:justify-between",
                      styles.top,
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold",
                          styles.logo,
                        )}
                      >
                        {getInitials(form.companyName || "NA")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold tracking-[-0.02em] text-[#111318]">
                          {formatFallback(form.companyName, "Unknown company")}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">
                            {formatStudentName(form)}
                          </span>
                          <span className="text-gray-300">-</span>
                          <span>{formatStudentEmail(form)}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {form.domain?.trim() ? (
                            <span className="inline-flex items-center rounded-full bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb]">
                              {form.domain.trim()}
                            </span>
                          ) : null}
                          {form.companyLocation?.trim() ? (
                            <span className="inline-flex items-center rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-medium text-gray-600">
                              {form.companyLocation.trim()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                            styles.tag,
                          )}
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {urgency.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2 text-[11px] font-semibold text-[#d97706] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <Clock3 className="h-3.5 w-3.5" />
                          Pending Review
                        </span>
                      </div>
                      <p className="text-[11.5px] text-gray-500 lg:text-right">
                        Submitted{" "}
                        {formatDisplayDate(form.createdAt, "MMM d, yyyy")} at{" "}
                        {formatDisplayTime(form.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid items-stretch gap-5 border-b border-[#e3e5ea] px-5 py-6 xl:grid-cols-2">
                    <div className="grid content-start gap-4">
                      <div className="rounded-xl bg-[#f8fafc] p-4 ring-1 ring-inset ring-[#eef2f6]">
                        <FieldBlock label="Student info">
                          <p className="text-[14px] font-semibold text-[#111827]">
                            {formatStudentName(form)}
                          </p>
                          <p className="text-[12.5px] text-gray-600">
                            {[
                              formatFallback(
                                form.studentClass,
                                "Class not set",
                              ),
                              formatFallback(
                                form.studentBranch,
                                "Branch not set",
                              ),
                              normalizeDivision(form.studentDivision),
                            ].join(" - ")}
                          </p>
                        </FieldBlock>
                      </div>

                      <div className="rounded-xl bg-[#f8fafc] p-4 ring-1 ring-inset ring-[#eef2f6]">
                        <FieldBlock label="Internship info">
                          <div className="space-y-3.5 text-[13px] text-gray-700">
                            <p>
                              <span className="font-semibold text-[#111827]">
                                Mode:
                              </span>{" "}
                              {normalizeMode(form.mode)} ({stipend.label})
                            </p>
                            <div className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfdf5_100%)] px-3.5 py-2.5 ring-1 ring-inset ring-[#d1fae5]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                              <span className="text-[13px] font-semibold text-[#16a34a]">
                                Stipend: {stipendSummary}
                              </span>
                            </div>
                            <p>
                              <span className="font-semibold text-[#111827]">
                                Timeline:
                              </span>{" "}
                              {timelineSummary}
                            </p>
                          </div>
                        </FieldBlock>
                      </div>
                    </div>

                    <div className="h-full rounded-xl bg-[#f8fafc] p-4 ring-1 ring-inset ring-[#eef2f6]">
                      <div className="flex h-full flex-col justify-between gap-5">
                        <FieldBlock label="Status & submission">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffbeb] px-3 py-1.5 text-[11px] font-semibold text-[#d97706]">
                                <Clock3 className="h-3.5 w-3.5" />
                                Pending Review
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold",
                                  styles.tag,
                                )}
                              >
                                <Clock3 className="h-3.5 w-3.5" />
                                {urgency.label}
                              </span>
                            </div>
                            <p className="text-[13px] font-medium text-[#111827]">
                              {formatDisplayDate(
                                form.createdAt,
                                "MMMM d, yyyy",
                              )}
                            </p>
                            <p className="text-[11.5px] text-gray-500">
                              at {formatDisplayTime(form.createdAt)}
                            </p>
                          </div>
                        </FieldBlock>

                        <div className="border-t border-[#eef2f6] pt-4">
                          <FieldBlock label="Contact info">
                            <div className="space-y-3.5">
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  Dept coordinator
                                </p>
                                {isEmail(form.deptCoordinatorEmail) ? (
                                  <a
                                    href={`mailto:${form.deptCoordinatorEmail}`}
                                    className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline"
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    {form.deptCoordinatorEmail}
                                  </a>
                                ) : (
                                  <p className="text-[12.5px] text-gray-500">
                                    No coordinator email available
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  HR email
                                </p>
                                {isEmail(form.hrEmail) ? (
                                  <a
                                    href={`mailto:${form.hrEmail}`}
                                    className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline"
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    {form.hrEmail}
                                  </a>
                                ) : (
                                  <p className="text-[12.5px] text-gray-500">
                                    No HR email available
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  Offer letter
                                </p>
                                {isExternalUrl(form.offerLetterURL) ? (
                                  <a
                                    href={form.offerLetterURL || undefined}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View offer letter
                                  </a>
                                ) : (
                                  <p className="text-[12.5px] text-gray-500">
                                    Offer letter unavailable
                                  </p>
                                )}
                              </div>
                            </div>
                          </FieldBlock>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#e3e5ea] bg-[#fafbfc] px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(form.id, "APPROVED")}
                        disabled={isLoading}
                        className="h-12 rounded-xl gap-2 border border-[#15803d] bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(22,163,74,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#15803d] hover:shadow-[0_14px_28px_rgba(22,163,74,0.24)]"
                        aria-label={`Approve internship form for ${formatStudentName(form)}`}
                      >
                        {isLoading && loadingAction === "APPROVED" ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/20">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                            Approve form
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => openRejectDialog(form)}
                        disabled={isLoading}
                        variant="outline"
                        className="h-12 rounded-xl gap-2 border-[#f8d7da] bg-white px-4 text-sm font-semibold text-[#c2414c] shadow-none transition-colors duration-200 hover:border-[#ef9aa3] hover:bg-[#fff7f8] hover:text-[#b42318]"
                        aria-label={`Reject internship form for ${formatStudentName(form)}`}
                      >
                        {isLoading && loadingAction === "REJECTED" ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fef2f2] ring-1 ring-[#fecaca]">
                              <XCircle className="h-3.5 w-3.5" />
                            </span>
                            Reject form
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-[#e3e5ea] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1}-
                  {Math.min(startIndex + PAGE_SIZE, filteredForms.length)} of{" "}
                  {filteredForms.length}
                </p>

                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (safePage > 1) {
                            setCurrentPage(safePage - 1);
                          }
                        }}
                        className={
                          safePage === 1 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1,
                    ).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === safePage}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (safePage < totalPages) {
                            setCurrentPage(safePage + 1);
                          }
                        }}
                        className={
                          safePage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={closeRejectDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Reject internship form</DialogTitle>
            <DialogDescription>
              {rejectingForm
                ? `Share a clear reason with ${formatStudentName(rejectingForm)} for ${rejectingForm.companyName}.`
                : "Share a clear reason for this rejection."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111318]">
              Rejection reason
            </p>
            <Textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Explain what needs to be corrected before the student submits again."
              className="min-h-[132px] resize-y"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                This message will be shown to the student in their dashboard.
              </span>
              <span className="text-gray-400">
                {rejectionReason.length}/500
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeRejectDialog(false)}
              disabled={loadingAction === "REJECTED"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitRejection}
              disabled={
                loadingAction === "REJECTED" || !normalizedRejectionReason
              }
              className="bg-[#b42318] text-white hover:bg-[#912018]"
            >
              {loadingAction === "REJECTED"
                ? "Rejecting..."
                : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
