import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, ROLE_HIERARCHY } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

// Only SUPER_ADMIN and AUDITOR may view this page
const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "AUDITOR"];

const ROLE_ORDER = Object.entries(ROLE_HIERARCHY)
  .sort((a, b) => b[1] - a[1])
  .map(([role]) => role as UserRole);

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as UserRole | undefined;

  if (!session || !role || !ALLOWED_ROLES.includes(role)) {
    redirect("/dashboard");
  }

  const permissions = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Roles &amp; Permissions</h1>
      <p className="text-sm text-gray-500 mb-6">
        Read-only reference matrix. Server-enforced on every API route.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 w-56">
                Permission
              </th>
              {ROLE_ORDER.map((r) => (
                <th
                  key={r}
                  className="text-center py-3 px-3 font-semibold text-gray-700 min-w-[110px]"
                >
                  {r.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, i) => (
              <tr
                key={perm}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="py-2 px-4 font-mono text-gray-800">{perm}</td>
                {ROLE_ORDER.map((r) => {
                  const granted = (
                    PERMISSIONS[perm] as readonly string[]
                  ).includes(r);
                  return (
                    <td key={r} className="text-center py-2 px-3">
                      {granted ? (
                        <span
                          className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-center leading-5"
                          aria-label="granted"
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className="inline-block w-5 h-5 rounded-full bg-gray-100 text-gray-300 text-center leading-5"
                          aria-label="denied"
                        >
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Last updated: permissions are derived live from{" "}
        <code>src/lib/permissions.ts</code>. This page always reflects the
        current state.
      </p>
    </div>
  );
}
