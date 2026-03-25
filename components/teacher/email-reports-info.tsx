"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Mail, Calendar, Clock, FileText, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

export function EmailReportsInfo() {
  const [sending, setSending] = useState(false);

  const scheduleInfo = {
    frequency: "Every 15 days",
    dates: "1st and 16th of each month",
    time: "09:00 AM IST",
    format: "CSV attachment",
    includes: [
      "Student names and emails",
      "Company names",
      "Attendance status (Present/Absent)",
      "IP addresses and locations",
      "Verification timestamps",
    ],
  };

  const handleSendNow = async () => {
    setSending(true);

    try {
      const response = await fetch("/api/scheduled/attendanceReports", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Reports sent successfully to ${data.data?.successCount || 0} teachers`,
          { duration: 5000 },
        );
      } else if (response.status === 401) {
        toast.error("You are not allowed to send reports.", { duration: 5000 });
      } else {
        toast.error("Failed to send reports", { duration: 5000 });
      }
    } catch (error) {
      toast.error("Error sending reports", { duration: 5000 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Attendance Reports Email Schedule</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Automated emails with attendance records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">
                Schedule
              </h3>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">Frequency</p>
                  <p className="text-sm text-gray-600 break-words">
                    {scheduleInfo.frequency}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 break-words">
                    {scheduleInfo.dates}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">Time</p>
                  <p className="text-sm text-gray-600 break-words">
                    {scheduleInfo.time}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700">Format</p>
                  <p className="text-sm text-gray-600 break-words">
                    {scheduleInfo.format}
                  </p>
                </div>
              </div>
            </div>

            {/* Email Content */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-base">
                Email Contains
              </h3>

              <ul className="space-y-2">
                {scheduleInfo.includes.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-blue-600 font-bold mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Test Button */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">
              Test the email delivery (sends immediately to all teachers)
            </p>
            <Button
              onClick={handleSendNow}
              disabled={sending}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
            >
              {sending ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Report Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <Card className="w-full shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Email Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm space-y-2 overflow-x-auto">
            <p className="break-words">
              <strong>From:</strong> Interntrack &lt;no-reply@rushabh.dev&gt;
            </p>
            <p className="break-words">
              <strong>Subject:</strong> Attendance Report - Last 15 Days
            </p>
            <p className="break-words">
              <strong>Attachment:</strong> attendance-report-YYYY-MM-DD.csv
            </p>
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded text-xs text-gray-700 space-y-1">
              <p>Dear [Teacher Name],</p>
              <p className="mt-2">
                Please find attached the attendance verification report for the
                last 15 days.
              </p>
              <p className="mt-2">
                <strong>Report Details:</strong>
              </p>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Period: Last 15 days</li>
                <li>• Format: CSV (Excel compatible)</li>
                <li>• Generated on: [Current Date]</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
