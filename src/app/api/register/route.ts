export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

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

    // Combine org + department info into the `department` field
    const deptInfo = [data.organization, data.department].filter(Boolean).join(" — ");

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: "CLIENT",
        status: "ACTIVE",
        department: deptInfo,
      },
    });

    return NextResponse.json(
      { success: true, message: "Account created. You can now log in. Please complete KYC verification in your portal settings to enable payment features." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input. Please check your details.", issues: err.issues },
        { status: 400 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json(
      { success: false, error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
