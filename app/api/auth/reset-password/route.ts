import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  hashPasswordResetToken,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth";

const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required."),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    ),
  confirmPassword: z.string(),
});

const INVALID_TOKEN_ERROR = "Invalid or expired reset link.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ResetPasswordSchema.parse(body);

    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    const tokenHash = hashPasswordResetToken(data.token);
    const now = new Date();
    const nextPasswordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
        return null;
      }

      const claimedToken = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      if (claimedToken.count !== 1) {
        return null;
      }

      await tx.user.update({
        where: {
          id: resetToken.user.id,
        },
        data: {
          password: nextPasswordHash,
        },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.user.id,
          id: {
            not: resetToken.id,
          },
        },
      });

      return {
        role: resetToken.user.role,
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: INVALID_TOKEN_ERROR },
        { status: 400 },
      );
    }

    const redirectTo =
      result.role === "TEACHER" ? "/teacher/login" : "/student/login";

    return NextResponse.json({
      message: "Password reset successful.",
      redirectTo,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      const firstIssue = error.issues?.[0]?.message || "Invalid input.";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return NextResponse.json(
        {
          error:
            "Password reset is not ready yet. Run the latest Prisma migration and try again.",
        },
        { status: 503 },
      );
    }

    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
