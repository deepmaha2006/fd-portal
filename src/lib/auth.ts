import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Roles that get a 30-minute idle timeout instead of the global 8-hour maxAge
const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_IDLE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"]);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:
        process.env.APP_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.APP_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip =
          (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          "unknown";

        let user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.hashedPassword) {
          await auditLog({
            action: "USER_LOGIN_FAILED",
            actorEmail: credentials.email,
            outcome: "FAILURE",
            metadata: { reason: "user_not_found" },
            ipAddress: ip,
          });
          return null;
        }

        // Check lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await auditLog({
            action: "USER_LOGIN_FAILED",
            actorId: user.id,
            actorEmail: user.email,
            outcome: "FAILURE",
            metadata: { reason: "account_locked" },
            ipAddress: ip,
          });
          throw new Error("AccountLocked");
        }

        // Auto-unlock: lockout period has expired but status is still LOCKED — reset it
        if (user.status === "LOCKED" && (!user.lockedUntil || user.lockedUntil <= new Date())) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { status: "ACTIVE", lockedUntil: null, failedLoginAttempts: 0 },
          });
        }

        // Check status
        if (user.status === "PENDING_VERIFICATION") {
          await auditLog({
            action: "USER_LOGIN_FAILED",
            actorId: user.id,
            actorEmail: user.email,
            outcome: "FAILURE",
            metadata: { reason: "pending_verification" },
            ipAddress: ip,
          });
          throw new Error("PendingVerification");
        }
        if (user.status !== "ACTIVE") {
          await auditLog({
            action: "USER_LOGIN_FAILED",
            actorId: user.id,
            actorEmail: user.email,
            outcome: "FAILURE",
            metadata: { reason: "account_inactive" },
            ipAddress: ip,
          });
          return null;
        }

        const passwordValid = await compare(
          credentials.password,
          user.hashedPassword!
        );

        if (!passwordValid) {
          const newFailCount = user.failedLoginAttempts + 1;
          const updateData: Record<string, unknown> = {
            failedLoginAttempts: newFailCount,
          };

          if (newFailCount >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            );
            updateData.status = "LOCKED";
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          await auditLog({
            action: newFailCount >= MAX_FAILED_ATTEMPTS ? "USER_LOCKED" : "USER_LOGIN_FAILED",
            actorId: user.id,
            actorEmail: user.email,
            outcome: "FAILURE",
            metadata: { reason: "invalid_password", failCount: newFailCount },
            ipAddress: ip,
          });
          return null;
        }

        // MFA check: only enforced when the user has explicitly configured a TOTP secret
        if (user.mfaEnabled && user.mfaSecret) {
          if (!credentials.mfaCode) {
            throw new Error("MfaRequired");
          }

          const { TOTP } = await import("otpauth");
          const totp = new TOTP({
            issuer: process.env.MFA_ISSUER ?? "FD Portal",
            label: user.email,
            secret: user.mfaSecret,
          });

          const delta = totp.validate({ token: credentials.mfaCode, window: 1 });
          if (delta === null) {
            await auditLog({
              action: "MFA_CHALLENGE_FAILED",
              actorId: user.id,
              actorEmail: user.email,
              outcome: "FAILURE",
              ipAddress: ip,
            });
            throw new Error("MfaInvalid");
          }

          await auditLog({
            action: "MFA_CHALLENGE_PASSED",
            actorId: user.id,
            actorEmail: user.email,
            outcome: "SUCCESS",
            ipAddress: ip,
          });
        }

        // Success — reset fail count
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ip,
            status: "ACTIVE",
          },
        });

        await auditLog({
          action: "USER_LOGIN",
          actorId: user.id,
          actorEmail: user.email,
          outcome: "SUCCESS",
          ipAddress: ip,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          tokenVersion: user.tokenVersion,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        // Store the tokenVersion at sign-in time so we can detect revocation
        token.tokenVersion = (user as any).tokenVersion ?? 0;
        // For admin roles: stamp an idle expiry 30 minutes from sign-in
        if (ADMIN_IDLE_ROLES.has((user as any).role)) {
          token.adminIdleExpiry = Date.now() + ADMIN_IDLE_TIMEOUT_MS;
        }
        // Record sign-in time so re-auth-sensitive actions can check freshness
        token.authTime = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;

      // Admin idle timeout: invalidate if 30 minutes have passed since last token issue
      if (
        token.adminIdleExpiry !== undefined &&
        Date.now() > (token.adminIdleExpiry as number)
      ) {
        return { ...session, user: undefined } as any;
      }

      // Re-check tokenVersion on every session refresh to catch revoked tokens
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { tokenVersion: true, role: true, status: true },
      });

      // If user was deactivated, role changed, or password reset — invalidate session
      if (
        !dbUser ||
        dbUser.status !== "ACTIVE" ||
        dbUser.tokenVersion !== (token.tokenVersion as number)
      ) {
        return { ...session, user: undefined } as any;
      }

      if (session.user) {
        (session.user as any).role = dbUser.role; // always use DB role, not stale JWT
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
