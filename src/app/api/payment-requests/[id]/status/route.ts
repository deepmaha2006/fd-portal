import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, UnauthorizedError, ForbiddenError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

const UpdateStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "CANCELLED"]),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const role = (session.user as any)?.role as string;
    const isAdmin = ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "FINANCE_OFFICER"].includes(role);

    if (!isAdmin) {
      // Clients can only cancel their own pending requests
      const existing = await prisma.paymentRequest.findUnique({
        where: { id: params.id },
        select: { clientId: true, status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (existing.clientId !== userId) throw new ForbiddenError("Access denied");

      const body = await req.json();
      const data = UpdateStatusSchema.parse(body);

      if (data.status !== "CANCELLED") {
        throw new ForbiddenError("Clients may only cancel their own requests");
      }

      if (!["SUBMITTED", "UNDER_REVIEW"].includes(existing.status)) {
        return NextResponse.json(
          { error: "This request cannot be cancelled in its current state." },
          { status: 422 }
        );
      }
    }

    const body = await req.json();
    const data = UpdateStatusSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.update({
        where: { id: params.id },
        data: {
          status: data.status,
          reviewedById: isAdmin ? userId : undefined,
          reviewedAt: isAdmin ? new Date() : undefined,
          reviewNotes: data.notes ?? undefined,
        },
      });

      await tx.paymentRequestHistory.create({
        data: {
          requestId: params.id,
          status: data.status,
          actorId: userId,
          notes: data.notes,
        },
      });

      return pr;
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
