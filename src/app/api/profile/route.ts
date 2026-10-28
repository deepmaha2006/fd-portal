export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserId, UnauthorizedError } from "@/lib/permissions";
import { ok, handleApiError } from "@/lib/api-response";

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  department: z.string().max(100).trim().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const userId = getUserId(session)!;
    const body = await req.json();
    const data = UpdateProfileSchema.parse(body);

    if (!data.name && data.department === undefined) {
      return ok({ message: "No changes" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.department !== undefined && { department: data.department }),
      },
      select: { id: true, name: true, email: true, department: true },
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
