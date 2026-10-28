/**
 * Maker-checker rules for deposits and payment requests.
 * All thresholds and SoD logic live here so routes stay thin.
 */

// 1,00,00,000 INR = 10,000,000
export const HIGH_VALUE_THRESHOLD = 10_000_000;

export function isHighValue(principalAmount: number): boolean {
  return principalAmount >= HIGH_VALUE_THRESHOLD;
}

/**
 * Deposit SoD: the user who created a deposit cannot approve it.
 */
export function canApproveDeposit(
  actorId: string,
  createdById: string | null | undefined
): boolean {
  if (!createdById) return true; // no creator on record — allow
  return actorId !== createdById;
}

/**
 * Release SoD: the user who requested a release cannot approve the RELEASED step.
 */
export function canApproveRelease(
  actorId: string,
  releaseRequestedById: string | null | undefined
): boolean {
  if (!releaseRequestedById) return true;
  return actorId !== releaseRequestedById;
}
