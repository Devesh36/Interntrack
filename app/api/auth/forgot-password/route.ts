import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, generatePasswordResetEmail } from "@/lib/email";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/auth";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a reset link has been sent.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ForgotPasswordSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: data.email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
    }

    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const resetToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        select: {
          id: true,
        },
      });
    });

    const emailSent = await sendEmail({
      to: user.email,
      subject: "Reset your Interntrack password",
      html: generatePasswordResetEmail(user.name, resetUrl),
    });

    if (!emailSent) {
      await prisma.passwordResetToken.deleteMany({
        where: {
          id: resetToken.id,
        },
      });
    }

    return NextResponse.json({ message: GENERIC_SUCCESS_MESSAGE });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
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

    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
