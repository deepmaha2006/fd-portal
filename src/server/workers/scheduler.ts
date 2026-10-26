#!/usr/bin/env tsx
/**
 * Standalone scheduler process.
 * Run: npm run workers:start
 */
import cron from "node-cron";
import { env } from "@/lib/env";
import { processReminders } from "./reminder-processor";

console.log("[scheduler] Starting FD Portal scheduler...");
console.log(`[scheduler] Reminder cron: ${env.REMINDER_CRON}`);

cron.schedule(env.REMINDER_CRON, async () => {
  console.log("[scheduler] Triggered reminder processing");
  try {
    await processReminders();
  } catch (err) {
    console.error("[scheduler] Reminder processing failed:", err);
  }
});

// Also run a status update job every hour
cron.schedule("0 * * * *", async () => {
  console.log("[scheduler] Running deposit status sync");
  // This is handled inside processReminders (overdue detection)
});

console.log("[scheduler] Scheduler running. Press Ctrl+C to stop.");

// Keep process alive
process.on("SIGTERM", () => {
  console.log("[scheduler] Shutting down...");
  process.exit(0);
});
