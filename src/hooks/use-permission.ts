"use client";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as UserRole | undefined;
  return hasPermission(role, permission);
}

export function useRole(): UserRole | null {
  const { data: session } = useSession();
  return ((session?.user as any)?.role as UserRole) ?? null;
}
