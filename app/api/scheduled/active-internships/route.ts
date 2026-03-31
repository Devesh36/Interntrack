import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// force-dynamic: this route reads request.headers (auth token) so it can never be statically generated
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    console.log(
      `[Cron] Starting activate-internships job at ${new Date().toISOString()}`,
    );

    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    //approve the forms that have started, not ended, but still inactive
    const toActivate = await prisma.internshipForm.findMany({
      where: {
        status: "APPROVED",
        isActive: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        studentId: true,
        companyName: true,
        startDate: true,
        endDate: true,
      },
    });

    if (toActivate.length === 0) {
      console.log(
        `[Cron] No internships to activate. Check: ${now.toISOString()}`,
      );

      return NextResponse.json({
        message: "No internships to activate.",
        count: 0,
      });
    }

    // Enforce one active internship per student
    await prisma.$transaction(async (tx) => {
      const studentIds = Array.from(
        new Set(toActivate.map((f) => f.studentId)),
      );

      await tx.internshipForm.updateMany({
        where: {
          studentId: { in: studentIds },
          isActive: true,
        },
        data: { isActive: false },
      });

      await tx.internshipForm.updateMany({
        where: {
          id: { in: toActivate.map((f) => f.id) },
        },
        data: { isActive: true },
      });
    });

    console.log(
      `[Cron] Successfully activated ${toActivate.length} internships at ${new Date().toISOString()}`,
    );

    return NextResponse.json({
      message: `Activated ${toActivate.length} internships`,
      activated: toActivate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auto-activation cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
