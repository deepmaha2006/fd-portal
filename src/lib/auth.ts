import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
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

        const user = await prisma.user.findUnique({
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

        // Check status
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
          user.hashedPassword
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

        // TODO: MFA verification if user.mfaEnabled

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
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
