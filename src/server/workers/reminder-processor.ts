/**
 * Reminder Processor — runs on a cron schedule.
 * Scans deposits approaching maturity and sends email notifications.
 * Uses database-backed idempotency to prevent duplicate sends.
 */

import { addDays, differenceInDays, format } from "date-fns";
import { prisma } from "@/lib/db";
import { sendEmail, reminderEmailHtml } from "@/lib/email";
import { auditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import type { NotificationEvent } from "@prisma/client";

const REMINDER_DAYS: Array<{ days: number; event: NotificationEvent }> = [
  { days: 90, event: "DAYS_90" },
  { days: 60, event: "DAYS_60" },
  { days: 30, event: "DAYS_30" },
  { days: 15, event: "DAYS_15" },
  { days: 7, event: "DAYS_7" },
  { days: 1, event: "DAYS_1" },
  { days: 0, event: "ON_DATE" },
];

export async function processReminders(): Promise<void> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  console.log(`[reminder-processor] Starting reminder run at ${now.toISOString()}`);

  // Load enabled reminder configs
  const configs = await prisma.reminderConfig.findMany({
    where: { isEnabled: true },
  });
  const enabledDays = new Set(configs.map((c) => c.daysBeforeEvent));
  const globalCcEmails = configs.flatMap((c) => c.recipientEmails);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const { days, event } of REMINDER_DAYS) {
    if (!enabledDays.has(days) && configs.length > 0) continue;

    const targetDate = addDays(now, days);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateEnd = addDays(targetDate, 1);

    // Find deposits maturing on targetDate that are still active
    const deposits = await prisma.deposit.findMany({
      where: {
        status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
        maturityDate: { gte: targetDate, lt: targetDateEnd },
      },
      include: {
        bank: { select: { name: true } },
        owner: { select: { email: true, name: true } },
        department: { select: { name: true } },
      },
    });

    for (const deposit of deposits) {
      processed++;
      const idempotencyKey = `reminder:${deposit.id}:${event}:${format(now, "yyyyMMdd")}`;

      // Check if already processed (idempotency)
      const existing = await prisma.reminderSchedule.findUnique({
        where: { idempotencyKey },
      });

      if (existing?.processedAt) {
        skipped++;
        continue;
      }

      // Determine recipients — owner + global CC
      const recipients = new Set<string>([...(globalCcEmails ?? [])]);
      if (deposit.owner?.email) recipients.add(deposit.owner.email);
      if (recipients.size === 0) {
        skipped++;
        continue;
      }

      const daysRemaining = differenceInDays(deposit.maturityDate!, now);
      const amount = Number(deposit.principalAmount).toLocaleString("en-IN", {
        style: "currency",
        currency: deposit.currency,
      });

      const subject = `[FD Portal] Deposit ${deposit.referenceNumber} matures in ${daysRemaining} day(s)`;
      const html = reminderEmailHtml({
        depositRef: deposit.referenceNumber,
        depositType: deposit.depositType,
        bank: deposit.bank?.name ?? "—",
        amount,
        maturityDate: format(deposit.maturityDate!, "dd MMM yyyy"),
        daysRemaining,
        appUrl: env.APP_URL,
      });

      // Create or update reminder schedule record
      const schedule = await prisma.reminderSchedule.upsert({
        where: { idempotencyKey },
        create: {
          depositId: deposit.id,
          event,
          scheduledFor: targetDate,
          idempotencyKey,
        },
        update: {},
      });

      // Create notification log entry
      const notifKey = `notif:${deposit.id}:${event}:${format(now, "yyyyMMdd")}`;
      let notifLog = await prisma.notificationLog.findUnique({
        where: { idempotencyKey: notifKey },
      });

      if (!notifLog) {
        notifLog = await prisma.notificationLog.create({
          data: {
            depositId: deposit.id,
            event,
            recipientEmail: [...recipients].join(";"),
            subject,
            idempotencyKey: notifKey,
          },
        });
      }

      // Send email with bounded retry (max 3 attempts)
      let lastError: string | null = null;
      let msgId: string | null = null;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          msgId = await sendEmail({
            to: [...recipients],
            subject,
            html,
          });
          break;
        } catch (err) {
          lastError = String(err);
          if (attempt < maxAttempts) {
            // Exponential backoff: 1s, 2s, 4s
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
          }
        }
      }

      // Update records
      const success = msgId !== null;
      await prisma.$transaction([
        prisma.notificationLog.update({
          where: { id: notifLog.id },
          data: {
            status: success ? "SENT" : "FAILED",
            providerMsgId: msgId,
            sentAt: success ? new Date() : null,
            errorMessage: lastError,
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        }),
        prisma.reminderSchedule.update({
          where: { id: schedule.id },
          data: { processedAt: new Date() },
        }),
      ]);

      if (success) {
        sent++;
        await auditLog({
          action: "NOTIFICATION_SENT",
          targetType: "Deposit",
          targetId: deposit.id,
          metadata: { event, daysRemaining, recipients: [...recipients] },
        });
      } else {
        failed++;
        await auditLog({
          action: "NOTIFICATION_FAILED",
          targetType: "Deposit",
          targetId: deposit.id,
          metadata: { event, error: lastError },
        });
        console.error(
          `[reminder-processor] Failed to send reminder for ${deposit.referenceNumber}: ${lastError}`
        );
      }
    }
  }

  // Check for overdue deposits
  await processOverdueNotifications(now, globalCcEmails);

  console.log(
    `[reminder-processor] Done. Processed=${processed} Sent=${sent} Skipped=${skipped} Failed=${failed}`
  );
}

async function processOverdueNotifications(
  now: Date,
  globalCcEmails: string[]
): Promise<void> {
  const overdueDeposits = await prisma.deposit.findMany({
    where: {
      status: { in: ["ACTIVE", "APPROVED", "MATURING_SOON"] },
      maturityDate: { lt: now },
    },
    include: {
      bank: { select: { name: true } },
      owner: { select: { email: true } },
    },
  });

  for (const deposit of overdueDeposits) {
    const idempotencyKey = `reminder:${deposit.id}:OVERDUE:${format(now, "yyyyMMdd")}`;
    const existing = await prisma.reminderSchedule.findUnique({
      where: { idempotencyKey },
    });
    if (existing?.processedAt) continue;

    // Auto-update status to MATURED
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { status: "MATURED" },
    });

    // Send overdue notification if we have recipients
    const recipients = new Set<string>(globalCcEmails);
    if (deposit.owner?.email) recipients.add(deposit.owner.email);

    if (recipients.size > 0) {
      const daysOverdue = differenceInDays(now, deposit.maturityDate!);
      const subject = `[FD Portal] OVERDUE: Deposit ${deposit.referenceNumber} matured ${daysOverdue} day(s) ago`;
      try {
        await sendEmail({
          to: [...recipients],
          subject,
          html: `<p>Deposit <strong>${deposit.referenceNumber}</strong> matured on
                 ${format(deposit.maturityDate!, "dd MMM yyyy")} (${daysOverdue} day(s) ago)
                 and requires immediate action.</p>`,
        });
      } catch {
        // Best-effort
      }
    }

    await prisma.reminderSchedule.upsert({
      where: { idempotencyKey },
      create: {
        depositId: deposit.id,
        event: "OVERDUE",
        scheduledFor: now,
        processedAt: now,
        idempotencyKey,
      },
      update: { processedAt: now },
    });
  }
}
