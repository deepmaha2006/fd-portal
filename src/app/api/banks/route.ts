export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const CreateBankSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(10).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const banks = await prisma.bank.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, _count: { select: { deposits: true } } },
    });

    return ok(banks);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    requirePermission((session.user as any)?.role as UserRole, "settings:manage");

    const body = await req.json();
    const data = CreateBankSchema.parse(body);

    const bank = await prisma.bank.create({ data });
    return ok(bank);
  } catch (err) {
    return handleApiError(err);
  }
}
