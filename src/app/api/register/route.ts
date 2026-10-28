export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf, getClientIp } from "@/lib/csrf";
import { env } from "@/lib/env";
import { handleApiError, tooManyRequests } from "@/lib/api-response";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
  phone: z.string().max(20).optional(),
  organization: z.string().min(2).max(100).trim(),
  department: z.string().max(100).optional(),
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
    const csrf = checkCsrf(req);
    if (!csrf.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req);

    const rl = await checkRateLimit(
      `register:${ip}`,
      env.RATE_LIMIT_REGISTER_MAX,
      env.RATE_LIMIT_REGISTER_WINDOW_SECONDS
    );
    if (!rl.allowed) return tooManyRequests(rl.resetAt);

    const body = await req.json();
    const data = RegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(data.password, 12);
    const deptInfo = [data.organization, data.department].filter(Boolean).join(" — ");

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: "CLIENT",
        status: "ACTIVE",
        department: deptInfo,
      },
    });

    await auditLog({
      action: "USER_CREATED",
      actorId: user.id,
      actorEmail: user.email,
      targetType: "User",
      targetId: user.id,
      ipAddress: ip,
      metadata: { role: "CLIENT", selfRegistered: true },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created. You can now log in. Please complete KYC verification in your portal settings to enable payment features.",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input. Please check your details.", issues: err.issues },
        { status: 400 }
      );
    }
    return handleApiError(err);
  }
}
