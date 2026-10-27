import { addDays, differenceInDays, format, isPast, isToday } from "date-fns";
import type { DepositStatus } from "@prisma/client";

// ─── Interest Calculation ─────────────────────────────────────────────────────
// Formula from Repo A (FD_ATS) — Simple interest: P × R × D / 365 / 100

export function calculateSimpleInterest(
  principal: number,
  annualRatePct: number,
  days: number
): number {
  return Math.round((principal * annualRatePct * days) / 365 / 100);
}

export function calculateMaturityAmount(
  principal: number,
  annualRatePct: number,
  days: number
): number {
  return principal + calculateSimpleInterest(principal, annualRatePct, days);
}

export function depositDaysHeld(issueDate: Date, toDate: Date = new Date()): number {
  return Math.max(0, differenceInDays(toDate, issueDate));
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export const TERMINAL_STATUSES: DepositStatus[] = [
  "RELEASED",
  "CANCELLED",
  "ARCHIVED",
  "RENEWED",
];

export const ACTIVE_STATUSES: DepositStatus[] = [
  "APPROVED",
  "ACTIVE",
  "MATURING_SOON",
];

export function isTerminal(status: DepositStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActive(status: DepositStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

// ─── Valid Transitions ────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<DepositStatus, DepositStatus[]>> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["MATURING_SOON", "MATURED", "RENEWAL_PENDING", "RELEASE_PENDING", "CANCELLED"],
  MATURING_SOON: ["MATURED", "RENEWAL_PENDING", "RELEASE_PENDING"],
  MATURED: ["RENEWAL_PENDING", "RELEASE_PENDING", "ARCHIVED"],
  RENEWAL_PENDING: ["RENEWED", "ACTIVE"],
  RENEWED: ["ARCHIVED"],
  RELEASE_PENDING: ["RELEASED"],
  RELEASED: ["ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function isValidTransition(
  from: DepositStatus,
  to: DepositStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Maturity Urgency ─────────────────────────────────────────────────────────

export type MaturityUrgency = "overdue" | "critical" | "warning" | "notice" | "ok" | "na";

export function getMaturityUrgency(maturityDate: Date | null): MaturityUrgency {
  if (!maturityDate) return "na";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(maturityDate, today);
  if (days < 0) return "overdue";
  if (days <= 7) return "critical";
  if (days <= 15) return "warning";
  if (days <= 30) return "notice";
  return "ok";
}

export function daysUntilMaturity(maturityDate: Date | null): number | null {
  if (!maturityDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(maturityDate, today);
}

// ─── Reference Number Generation ─────────────────────────────────────────────

export function generateReferenceNumber(sequence: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `FDP-${y}-${String(sequence).padStart(4, "0")}`;
}

// ─── CSV Sanitization ─────────────────────────────────────────────────────────
// Prevent formula injection: https://owasp.org/www-community/attacks/CSV_Injection

export function sanitizeCsvField(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  // Strip or quote any cell that starts with a formula trigger
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Currency Formatting ─────────────────────────────────────────────────────

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "INR"
): string {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}
