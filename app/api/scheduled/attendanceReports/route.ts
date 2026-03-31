import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, generateTeacherReportEmail } from "@/lib/email";
import { verifyToken } from "@/lib/auth";

async function handleAttendanceReport(req: NextRequest) {
  try {
    console.log(
      `[Cron] Attendance report triggered via ${req.method} at ${new Date().toISOString()}`,
    );

    //verify the request from the cron job
    const authToken = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;

    console.log(
      `[Cron] Auth check — cronSecret set: ${!!cronSecret}, authToken present: ${!!authToken}, cronHeader present: ${!!cronHeader}`,
    );

    const isCronAuthorized =
      !!cronSecret &&
      (authToken === `Bearer ${cronSecret}` || cronHeader === cronSecret);

    let isTeacherAuthorized = false;
    if (!isCronAuthorized) {
      const token = req.cookies.get("auth-token")?.value;
      if (token) {
        const user = verifyToken(token);
        isTeacherAuthorized = user?.role === "TEACHER";
      }
    }

    console.log(
      `[Cron] Authorization result — cron: ${isCronAuthorized}, teacher: ${isTeacherAuthorized}`,
    );

    if (!isCronAuthorized && !isTeacherAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //Calculating the date
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    //get the internship coordinator (TEACHER)
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER" },
      select: { name: true, id: true, email: true },
    });

    if (teachers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No teacher Found",
      });
    }

    //get attendance record for last 15 days
    const attendanceRecords = await prisma.verificationLog.findMany({
      where: {
        timestamp: { gte: fifteenDaysAgo },
      },
      include: {
        attendance: {
          include: {
            student: {
              select: { name: true, email: true },
            },
            internshipForm: {
              select: { companyName: true },
            },
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Generate CSV content
    const csvRows: string[] = [];

    // Headers
    const headers = [
      "Student Name",
      "Student Email",
      "Company",
      "Attendance Status",
      "IP Address",
      "Location",
      "Verified At",
    ];
    csvRows.push(headers.map((h) => `"${h}"`).join(","));

    const escapeCsv = (value: string | null | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    // Data rows
    for (const log of attendanceRecords) {
      const cols = [
        escapeCsv(log.attendance.student.name),
        escapeCsv(log.attendance.student.email),
        escapeCsv(log.attendance.internshipForm.companyName),
        escapeCsv(log.action),
        escapeCsv(log.ipAddress),
        escapeCsv(log.location || "Unknown"),
        escapeCsv(new Date(log.timestamp).toLocaleString()),
      ];
      csvRows.push(cols.join(","));
    }

    const csvContent = csvRows.join("\n");
    const fileName = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;

    //send email to teacher
    let successCount = 0;
    const errors: string[] = [];

    for (const teacher of teachers) {
      try {
        const sent = await sendEmail({
          to: teacher.email,
          subject: `Attendance Report - Last 15 Days`,
          html: generateTeacherReportEmail(teacher.name),
          attachments: [
            {
              filename: fileName,
              content: csvContent,
              contentType: "text/csv",
            },
          ],
        });

        if (sent) successCount++;
      } catch (error) {
        errors.push(`Failed to send ${teacher.email}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reports sent successfully",
      data: {
        teachersCount: teachers.length,
        successCount,
        recordsIncluded: attendanceRecords.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Scheduled Email Failed: ", error);
    return NextResponse.json(
      { error: "Failed to send the reports", details: String(error) },
      { status: 500 },
    );
  }
}

// Vercel Crons send GET requests
export async function GET(req: NextRequest) {
  return handleAttendanceReport(req);
}

// Keep POST for manual teacher-triggered reports
export async function POST(req: NextRequest) {
  return handleAttendanceReport(req);
}
