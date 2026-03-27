import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      class: studentClass,
      branch,
      division,
      teacherId,
      companyName,
      companyLocation,
      domain,
      durationWeeks,
      startDate,
      endDate,
      stipend,
      stipendAmount,
      mode,
      offerLetterURL,
      deptCoordinatorEmail,
      hrEmail,
    } = body;

    const required = [
      ["name", name],
      ["class", studentClass],
      ["branch", branch],
      ["division", division],
      ["teacherId", teacherId],
      ["companyName", companyName],
      ["companyLocation", companyLocation],
      ["domain", domain],
      ["durationWeeks", durationWeeks],
      ["startDate", startDate],
      ["endDate", endDate],
      ["stipend", stipend],
      ["mode", mode],
      ["offerLetterURL", offerLetterURL],
      ["deptCoordinatorEmail", deptCoordinatorEmail],
      ["hrEmail", hrEmail],
    ];
    const missing = required.filter(
      ([, v]) => v === undefined || v === null || v === "",
    );
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing fields: ${missing.map(([k]) => k).join(", ")}` },
        { status: 400 },
      );
    }

    if (stipend !== "paid" && stipend !== "unpaid") {
      return NextResponse.json(
        { error: "Stipend must be either paid or unpaid." },
        { status: 400 },
      );
    }

    const parsedStipendAmount =
      stipendAmount === undefined ||
      stipendAmount === null ||
      stipendAmount === ""
        ? null
        : Number.parseInt(String(stipendAmount), 10);

    if (
      stipend === "paid" &&
      (parsedStipendAmount === null ||
        Number.isNaN(parsedStipendAmount) ||
        parsedStipendAmount < 0)
    ) {
      return NextResponse.json(
        { error: "Enter a valid stipend amount for paid internships." },
        { status: 400 },
      );
    }

    if (
      parsedStipendAmount !== null &&
      (Number.isNaN(parsedStipendAmount) || parsedStipendAmount < 0)
    ) {
      return NextResponse.json(
        { error: "Stipend amount must be a non-negative number." },
        { status: 400 },
      );
    }

    // Check for existing active internship
    const existingInternship = await prisma.internshipForm.findFirst({
      where: {
        studentId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { id: true, companyName: true, status: true },
    });

    if (existingInternship) {
      return NextResponse.json(
        {
          error:
            existingInternship.status === "PENDING"
              ? `You already have a pending internship form (${existingInternship.companyName}). Wait for review before submitting another.`
              : `You already have an approved internship (${existingInternship.companyName}). Complete it before submitting a new form.`,
        },
        { status: 400 },
      );
    }

    const form = await prisma.internshipForm.create({
      data: {
        studentId: user.id,
        studentName: name,
        studentClass,
        studentBranch: branch,
        studentDivision: division,
        teacherId,
        companyName,
        companyLocation,
        domain,
        durationWeeks: parseInt(durationWeeks, 10),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        stipend,
        stipendAmount: stipend === "paid" ? parsedStipendAmount : null,
        mode,
        offerLetterURL,
        deptCoordinatorEmail,
        hrEmail,
      },
      include: {
        student: { select: { name: true, email: true } },
        teacher: { select: { name: true, email: true } },
      },
    });

    // Update student's branch and division only if not already set
    if (!user.branch) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          branch,
          division,
        },
      });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("Internship form creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    let forms;
    if (user.role === "STUDENT") {
      const studentForms = await prisma.internshipForm.findMany({
        where: { studentId: user.id },
        include: {
          teacher: { select: { name: true, email: true } },
          attendances: {
            orderBy: { date: "desc" },
            include: {
              logs: {
                orderBy: { timestamp: "desc" },
                take: 1,
                select: {
                  location: true,
                  timestamp: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      forms = studentForms.map((form) => ({
        ...form,
        attendances: form.attendances.map((attendance) => ({
          id: attendance.id,
          date: attendance.date,
          status: attendance.status,
          createdAt: attendance.createdAt,
          location: attendance.logs[0]?.location ?? null,
          verifiedAt: attendance.logs[0]?.timestamp ?? null,
        })),
      }));
    } else if (user.role === "TEACHER") {
      forms = await prisma.internshipForm.findMany({
        where: { teacherId: user.id },
        include: {
          student: { select: { id: true, name: true, email: true } },
          attendances: {
            orderBy: { date: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(forms);
  } catch (error) {
    console.error("Fetch forms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
