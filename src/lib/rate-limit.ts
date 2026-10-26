import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number = env.RATE_LIMIT_LOGIN_MAX,
  windowSeconds: number = env.RATE_LIMIT_LOGIN_WINDOW_SECONDS
): Promise<RateLimitResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000);

  try {
    // Clean expired entries first
    await prisma.rateLimit.deleteMany({
      where: { windowEnd: { lt: now } },
    });

    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.windowEnd < now) {
      // New window
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowEnd },
        update: { count: 1, windowEnd },
      });
      return { allowed: true, remaining: maxRequests - 1, resetAt: windowEnd };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.windowEnd,
      };
    }

    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: maxRequests - updated.count,
      resetAt: existing.windowEnd,
    };
  } catch {
    // Fail open on rate-limit DB errors — don't block users due to DB issue
    return { allowed: true, remaining: maxRequests, resetAt: windowEnd };
  }
}
