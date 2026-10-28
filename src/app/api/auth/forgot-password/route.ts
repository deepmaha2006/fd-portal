export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/csrf";
import { handleApiError } from "@/lib/api-response";

const Schema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`forgot-password:${ip}`, 5, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = Schema.parse(body);

    // Always return success to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.status === "ACTIVE") {
      // Invalidate previous unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      await auditLog({
        action: "PASSWORD_RESET_REQUESTED",
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
      });

      const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
      sendEmail({
        to: user.email,
        subject: "Reset your password — FD Portal",
        html: passwordResetEmailHtml({ name: user.name, resetUrl }),
      }).catch((err) => {
        console.warn("[forgot-password] Email send failed:", err?.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: "If that email is registered, you'll receive a reset link shortly.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    return handleApiError(err);
  }
}

function passwordResetEmailHtml(params: { name: string; resetUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset your password — FD Portal</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">FD Portal — Password Reset</h1>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Hello ${params.name},</p>
    <p>We received a request to reset your password. Click the button below to set a new one.
       This link expires in <strong>1 hour</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${params.resetUrl}"
         style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">
        Reset Password
      </a>
    </p>
    <p style="color: #64748b; font-size: 12px;">
      If you did not request a password reset, you can safely ignore this email — your password will not change.<br>
      Link: <a href="${params.resetUrl}" style="color: #1e40af;">${params.resetUrl}</a>
    </p>
  </div>
</body>
</html>`;
}
