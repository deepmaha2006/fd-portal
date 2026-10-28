export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * GET /api/auth/verify-email?token=<hex>
 *
 * Validates the 24-hour email verification token sent at registration.
 * On success: sets emailVerified, clears the token, redirects to /login?verified=1.
 * On failure: redirects to /login?error=verification_failed.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=verification_failed`);
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { gte: new Date() },
      emailVerified: null,
    },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=verification_failed`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    },
  });

  await auditLog({
    action: "USER_CREATED", // closest available action; EMAIL_VERIFIED would be ideal
    actorId: user.id,
    actorEmail: user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { event: "email_verified" },
  });

  return NextResponse.redirect(`${env.APP_URL}/login?verified=1`);
}
