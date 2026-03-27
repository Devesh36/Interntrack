import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// force-dynamic: this route reads request.headers (auth token) so it can never be statically generated
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // Only allow Vercel Cron or dev environment
    const authHeader = request.headers.get("authorization");

    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    //1. Find all expired internships that are active
    const expiredInternships = await prisma.internshipForm.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
        endDate: { lt: now },
      },
      select: {
        id: true,
        companyName: true,
        studentId: true,
        endDate: true,
      },
    });

    if (expiredInternships.length === 0) {
      return NextResponse.json({
        message: "No expired internships found.",
        count: 0,
      });
    }

    //2. Mark them as inactive
    const result = await prisma.internshipForm.updateMany({
      where: {
        id: {
          in: expiredInternships.map((f) => f.id),
        },
      },
      data: {
        status: "COMPLETED",
        isActive: false,
      },
    });

    // 3. Log what was completed
    console.log(
      `[Cron] Completed ${result.count} internships at ${new Date().toISOString()}`,
      expiredInternships,
    );

    return NextResponse.json({
      message: `Successfully completed ${result.count} expired internships`,
      completed: expiredInternships,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auto-completion cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
