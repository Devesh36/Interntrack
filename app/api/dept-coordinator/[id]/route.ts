import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const requireTeacher = (request: NextRequest) => {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user || user.role !== "TEACHER") return null;
  return user;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!requireTeacher(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const branch = String(body.branch || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!branch || !name || !email) {
      return NextResponse.json(
        { error: "Branch, name, and email are required." },
        { status: 400 },
      );
    }

    const coordinator = await prisma.departmentCoordinator.update({
      where: { id: params.id },
      data: { branch, email, name },
    });

    return NextResponse.json(coordinator);
  } catch (error: any) {
    console.error("Failed to update coordinator:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Coordinator branch must be unique." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update coordinator" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!requireTeacher(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.departmentCoordinator.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete coordinator:", error);
    return NextResponse.json(
      { error: "Failed to delete coordinator" },
      { status: 500 },
    );
  }
}
