/**
 * Clear all transactional data and seed realistic demo data.
 * Run: npx tsx scripts/clear-and-seed-demo.ts
 *
 * What it does:
 * 1. Deletes all PaymentRequestHistory, PaymentRequest, KycVerification records
 * 2. Resets isKycVerified on all users
 * 3. Re-verifies the test client user + creates KYC record
 * 4. Seeds 5 demo payment requests across various statuses
 */

import { PrismaClient, PaymentRequestStatus, PaymentRequestType, KycDocumentType } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_EMAIL = "client@fdportal.dev";
const FINANCE_MANAGER_EMAIL = "finmanager@fdportal.dev";
const FINANCE_OFFICER_EMAIL = "finofficer@fdportal.dev";

async function main() {
  console.log("🧹  Clearing existing transactional data...");

  // Delete in dependency order
  await prisma.paymentRequestHistory.deleteMany({});
  await prisma.paymentRequest.deleteMany({});
  await prisma.kycVerification.deleteMany({});

  // Reset KYC flags
  await prisma.user.updateMany({ data: { isKycVerified: false } });

  console.log("   ✓ Cleared PaymentRequests, PaymentRequestHistory, KycVerification");

  // Find key users
  const client = await prisma.user.findUnique({ where: { email: CLIENT_EMAIL } });
  const finManager = await prisma.user.findUnique({ where: { email: FINANCE_MANAGER_EMAIL } });
  const finOfficer = await prisma.user.findUnique({ where: { email: FINANCE_OFFICER_EMAIL } });

  if (!client) {
    console.error(`❌  Client user not found: ${CLIENT_EMAIL}`);
    console.error("    Run 'npx tsx scripts/seed-test-users.ts' first.");
    process.exit(1);
  }

  // Mark client as KYC verified
  await prisma.user.update({
    where: { id: client.id },
    data: { isKycVerified: true },
  });

  // Create approved KYC record for client
  await prisma.kycVerification.create({
    data: {
      userId: client.id,
      documentType: KycDocumentType.AADHAAR,
      documentNumber: "987654321098",
      fullName: "Demo Client User",
      status: "APPROVED",
      submittedAt: new Date("2026-10-01T10:00:00Z"),
      reviewedById: finManager?.id ?? undefined,
      reviewedAt: new Date("2026-10-02T09:30:00Z"),
    },
  });

  console.log("   ✓ KYC verified for client user");

  // Helper to generate request numbers
  let seq = 1;
  const reqNum = () => `REQ-${String(seq++).padStart(5, "0")}`;

  type DemoRequest = {
    requestNumber: string;
    clientId: string;
    type: PaymentRequestType;
    status: PaymentRequestStatus;
    amount?: number;
    currency: string;
    bankName?: string;
    accountNumber?: string;
    durationMonths?: number;
    description: string;
    urgency: string;
    reviewedById?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    createdAt: Date;
    history: Array<{
      status: PaymentRequestStatus;
      notes?: string;
      actorId?: string;
      createdAt: Date;
    }>;
  };

  const demos: DemoRequest[] = [
    // 1. COMPLETED — full lifecycle
    {
      requestNumber: reqNum(),
      clientId: client.id,
      type: "NEW_DEPOSIT",
      status: "COMPLETED",
      amount: 500000,
      currency: "INR",
      bankName: "State Bank of India",
      accountNumber: "10987654321",
      durationMonths: 12,
      description:
        "Requesting a new fixed deposit of ₹5,00,000 for 12 months with SBI Main Branch. " +
        "Purpose: Corporate security deposit for office lease agreement.",
      urgency: "NORMAL",
      reviewedById: finManager?.id,
      reviewedAt: new Date("2026-10-05T14:20:00Z"),
      createdAt: new Date("2026-10-01T10:00:00Z"),
      history: [
        { status: "SUBMITTED",    notes: "Request submitted by client",           actorId: client.id,      createdAt: new Date("2026-10-01T10:00:00Z") },
        { status: "UNDER_REVIEW", notes: "Assigned to finance officer for review", actorId: finOfficer?.id, createdAt: new Date("2026-10-02T09:00:00Z") },
        { status: "APPROVED",     notes: "Documents verified. Approved for processing.", actorId: finManager?.id, createdAt: new Date("2026-10-03T11:30:00Z") },
        { status: "PROCESSING",   notes: "Initiated FD creation with SBI",         actorId: finManager?.id, createdAt: new Date("2026-10-04T10:00:00Z") },
        { status: "COMPLETED",    notes: "FD created. Certificate no. FDR-2026-00421.", actorId: finManager?.id, createdAt: new Date("2026-10-05T14:20:00Z") },
      ],
    },

    // 2. APPROVED — waiting to process
    {
      requestNumber: reqNum(),
      clientId: client.id,
      type: "RENEWAL",
      status: "APPROVED",
      amount: 250000,
      currency: "INR",
      bankName: "HDFC Bank",
      accountNumber: "50100123456789",
      durationMonths: 24,
      description:
        "Renewal of existing FD No. HD-2024-0098 for another 24 months. " +
        "Current maturity date: 15 Nov 2026. Requesting early renewal at the same terms.",
      urgency: "HIGH",
      reviewedById: finManager?.id,
      reviewedAt: new Date("2026-10-20T10:00:00Z"),
      createdAt: new Date("2026-10-18T09:00:00Z"),
      history: [
        { status: "SUBMITTED",    notes: "Renewal request submitted",              actorId: client.id,      createdAt: new Date("2026-10-18T09:00:00Z") },
        { status: "UNDER_REVIEW", notes: "Reviewing renewal terms",                actorId: finOfficer?.id, createdAt: new Date("2026-10-19T10:00:00Z") },
        { status: "APPROVED",     notes: "Renewal approved. Proceed with HDFC.",   actorId: finManager?.id, createdAt: new Date("2026-10-20T10:00:00Z") },
      ],
    },

    // 3. UNDER_REVIEW — in progress
    {
      requestNumber: reqNum(),
      clientId: client.id,
      type: "RELEASE",
      status: "UNDER_REVIEW",
      amount: 100000,
      currency: "INR",
      bankName: "ICICI Bank",
      accountNumber: "000405123456",
      description:
        "Requesting release of FD No. IC-2023-0341 of ₹1,00,000. " +
        "The underlying contract has been terminated and the deposit is no longer required.",
      urgency: "NORMAL",
      reviewedById: finOfficer?.id,
      reviewedAt: new Date("2026-10-27T11:00:00Z"),
      createdAt: new Date("2026-10-25T15:00:00Z"),
      history: [
        { status: "SUBMITTED",    notes: "Release request submitted",              actorId: client.id,      createdAt: new Date("2026-10-25T15:00:00Z") },
        { status: "UNDER_REVIEW", notes: "Verifying contract termination docs",    actorId: finOfficer?.id, createdAt: new Date("2026-10-27T11:00:00Z") },
      ],
    },

    // 4. SUBMITTED — just submitted
    {
      requestNumber: reqNum(),
      clientId: client.id,
      type: "NEW_DEPOSIT",
      status: "SUBMITTED",
      amount: 1000000,
      currency: "INR",
      bankName: "Axis Bank",
      accountNumber: "917010054321",
      durationMonths: 36,
      description:
        "New fixed deposit request for ₹10,00,000 for 36 months with Axis Bank. " +
        "This is for a government tender earnest money deposit. Urgent processing requested.",
      urgency: "URGENT",
      createdAt: new Date("2026-10-28T14:00:00Z"),
      history: [
        { status: "SUBMITTED", notes: "Request submitted", actorId: client.id, createdAt: new Date("2026-10-28T14:00:00Z") },
      ],
    },

    // 5. REJECTED — with reason
    {
      requestNumber: reqNum(),
      clientId: client.id,
      type: "PAYMENT_QUERY",
      status: "REJECTED",
      amount: 75000,
      currency: "INR",
      description:
        "Query regarding interest payment for FD No. SBI-2025-0012. " +
        "Interest has not been credited to account for the last 2 quarters.",
      urgency: "HIGH",
      reviewedById: finOfficer?.id,
      reviewedAt: new Date("2026-10-15T16:00:00Z"),
      reviewNotes:
        "This FD is managed by a different department. Please contact the Finance Department directly or resubmit with the correct FD reference number.",
      createdAt: new Date("2026-10-12T12:00:00Z"),
      history: [
        { status: "SUBMITTED",    notes: "Query submitted",                        actorId: client.id,      createdAt: new Date("2026-10-12T12:00:00Z") },
        { status: "UNDER_REVIEW", notes: "Reviewing FD records",                   actorId: finOfficer?.id, createdAt: new Date("2026-10-14T09:00:00Z") },
        { status: "REJECTED",     notes: "FD managed by different department. Resubmit with correct reference.", actorId: finOfficer?.id, createdAt: new Date("2026-10-15T16:00:00Z") },
      ],
    },
  ];

  console.log("🌱  Seeding demo payment requests...");

  for (const demo of demos) {
    const { history, ...requestData } = demo;

    const created = await prisma.paymentRequest.create({
      data: {
        ...requestData,
        statusHistory: {
          create: history.map((h) => ({
            status: h.status,
            notes: h.notes,
            actorId: h.actorId,
            createdAt: h.createdAt,
          })),
        },
      },
    });

    console.log(`   ✓ ${created.requestNumber}  ${created.type}  [${created.status}]  ₹${(created.amount ?? 0).toLocaleString("en-IN")}`);
  }

  console.log("\n✅  Demo seeding complete!");
  console.log(`   Client login: ${CLIENT_EMAIL} / Client@FDP2026!`);
  console.log("   Log in as the client to see all 5 requests in the portal.");
  console.log("   Log in as finmanager@fdportal.dev to review/approve/reject them.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
