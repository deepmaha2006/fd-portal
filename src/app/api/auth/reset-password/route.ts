export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/csrf";
import { handleApiError } from "@/lib/api-response";

const Schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const { token, password } = Schema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          hashedPassword,
          tokenVersion: { increment: 1 }, // revoke existing sessions
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: "ACTIVE",
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await auditLog({
      action: "PASSWORD_RESET_COMPLETED",
      actorId: resetToken.userId,
      actorEmail: resetToken.user.email,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Password updated. You can now sign in with your new password.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 12 characters with uppercase, lowercase, number and special character." },
        { status: 400 }
      );
    }
    return handleApiError(err);
  }
}
