import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    let whereClause: any = {};

    if (user.role === "STUDENT") {
      whereClause = {
        attendance: {
          studentId: user.id,
        },
      };
    } else if (user.role === "TEACHER") {
      if (studentId) {
        // Verify the student is assigned to this teacher
        const form = await prisma.internshipForm.findFirst({
          where: {
            studentId,
            teacherId: user.id,
          },
        });

        if (!form) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        whereClause = {
          attendance: {
            studentId,
          },
        };
      } else {
        // Get all logs for students assigned to this teacher
        whereClause = {
          attendance: {
            internshipForm: {
              teacherId: user.id,
            },
          },
        };
      }
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      prisma.verificationLog.findMany({
        where: whereClause,
        include: {
          attendance: {
            include: {
              student: { select: { name: true, email: true } },
              internshipForm: { select: { companyName: true } },
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.verificationLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      logs,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Fetch logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
