export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const CreateBeneficiarySchema = z.object({
  name: z.string().min(2).max(300),
  type: z.string().max(50).optional(),
  email: z.string().email().optional(),
  contact: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  panNumber: z.string().max(20).optional(),
  gstNumber: z.string().max(20).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const beneficiaries = await prisma.beneficiary.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        _count: { select: { deposits: true } },
      },
    });

    return ok(beneficiaries);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    requirePermission((session.user as any)?.role as UserRole, "deposit:create");

    const body = await req.json();
    const data = CreateBeneficiarySchema.parse(body);

    const beneficiary = await prisma.beneficiary.create({ data });
    return ok(beneficiary);
  } catch (err) {
    return handleApiError(err);
  }
}
