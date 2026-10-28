export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requirePermission, getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, created, handleApiError } from "@/lib/api-response";

const CreateUserSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  name: z.string().min(2).max(100),
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "FINANCE_MANAGER",
    "FINANCE_OFFICER",
    "AUDITOR",
    "VIEWER",
  ]),
  department: z.string().max(100).optional(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:read");

    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 100);

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          department: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    return ok({ users, pagination: { page, limit, total } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();
    requirePermission(session, "user:create");

    const actorId = getUserId(session)!;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const body = await req.json();
    const data = CreateUserSchema.parse(body);

    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        department: data.department,
        hashedPassword,
        status: "ACTIVE",
        createdById: actorId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        createdAt: true,
      },
    });

    await auditLog({
      action: "USER_CREATED",
      actorId,
      targetType: "User",
      targetId: user.id,
      ipAddress: ip,
      metadata: { email: user.email, role: user.role },
    });

    return created(user);
  } catch (err) {
    return handleApiError(err);
  }
}
