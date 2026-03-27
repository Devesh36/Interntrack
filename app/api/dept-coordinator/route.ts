import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const getAuthUser = (request: NextRequest) => {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
};

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coordinators = await prisma.departmentCoordinator.findMany({
      orderBy: { branch: "asc" },
    });
    return NextResponse.json({ coordinators });
  } catch (error) {
    console.error("Failed to fetch coordinators:", error);
    return NextResponse.json(
      { error: "Failed to fetch coordinators" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user || user.role !== "TEACHER") {
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

    const coordinator = await prisma.departmentCoordinator.create({
      data: { branch, email, name },
    });

    return NextResponse.json(coordinator, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create coordinator:", error);

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
      { error: "Failed to create coordinator" },
      { status: 500 },
    );
  }
}
