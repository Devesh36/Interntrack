export interface StipendAnalytics {
  paid: number;
  unpaid: number;
  unknown: number;
}

export interface StipendAmountAnalytics {
  average: number | null;
  min: number | null;
  max: number | null;
  total: number;
  count: number;
  distribution: Array<{ range: string; count: number }>;
}

export interface ModeAnalytics {
  online: number;
  offline: number;
  hybrid: number;
  unknown: number;
}

export interface DurationAnalytics {
  average: number;
  min: number;
  max: number;
  distribution: Array<{ range: string; count: number }>;
}

export interface YearAnalytics {
  year: string;
  count: number;
}

export interface SubmissionTimelineMonth {
  month: string;
  count: number;
}

export interface SubmissionTimelineYear {
  year: string;
  months: SubmissionTimelineMonth[];
}

export interface RawInternship {
  id: string;
  companyName: string;
  companyLocation: string | null;
  domain: string | null;
  stipend: string | null;
  stipendAmount: number | null;
  mode: string | null;
  durationWeeks: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  studentBranch: string | null;
  student: { id: string; name: string; branch: string | null };
}

export interface AttendanceByBranch {
  branch: string;
  total: number;
  verified: number;
  rate: number;
}

export interface AnalyticsData {
  summary: {
    totalApproved: number;
    uniqueBranches: number;
    uniqueCompanies: number;
  };
  branchAnalytics: Array<{ branch: string; count: number }>;
  companyAnalytics: Array<{ company: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  branchCompanyChartData: Array<Record<string, string | number>>;
  stipendAnalytics: StipendAnalytics;
  stipendAmountAnalytics: StipendAmountAnalytics;
  modeAnalytics: ModeAnalytics;
  durationAnalytics: DurationAnalytics;
  yearAnalytics: YearAnalytics[];
  locationAnalytics: Array<{ location: string; count: number }>;
  domainAnalytics: Array<{ domain: string; count: number }>;
  attendanceAnalytics: AttendanceByBranch[];
  rawInternships: RawInternship[];
}

export interface FilteredData {
  totalInternships: number;
  activeNow: number;
  completed: number;
  uniqueBranches: number;
  uniqueCompanies: number;
  branchDistribution: Array<{ branch: string; count: number }>;
  companyDistribution: Array<{ company: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  branchCompanyChart: Array<Record<string, string | number>>;
  stipendAnalytics: StipendAnalytics;
  stipendAmountAnalytics: StipendAmountAnalytics;
  modeAnalytics: ModeAnalytics;
  durationAnalytics: DurationAnalytics;
  yearAnalytics: YearAnalytics[];
  submissionTimelineByYear: SubmissionTimelineYear[];
  locationDistribution: Array<{ location: string; count: number }>;
  domainDistribution: Array<{ domain: string; count: number }>;
  domainTrends: DomainTrend[];
  domainTrendKeys: string[];
  attendanceByBranch: AttendanceByBranch[];
}

export interface DomainTrend {
  year: string;
  [domain: string]: string | number;
}

export type StatusFilter = "all" | "ongoing" | "completed";
export type ModeFilter = "all" | "onsite" | "remote" | "hybrid";
