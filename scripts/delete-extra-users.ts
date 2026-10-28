import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const KEEP = [
  "admin@fdportal.dev",
  "sysadmin@fdportal.dev",
  "finmanager@fdportal.dev",
  "finofficer@fdportal.dev",
  "auditor@fdportal.dev",
  "viewer@fdportal.dev",
  "client@fdportal.dev",
];

async function main() {
  const all = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  const toDelete = all.filter((u) => !KEEP.includes(u.email));

  console.log(`Found ${all.length} users total. Keeping ${KEEP.length} RBAC accounts.`);
  if (toDelete.length === 0) {
    console.log("Nothing to delete — only test users exist.");
    return;
  }

  console.log(`\nDeleting ${toDelete.length} extra user(s):`);
  toDelete.forEach((u) => console.log(`  - ${u.email}  [${u.role}]`));

  const ids = toDelete.map((u) => u.id);

  await prisma.paymentRequestHistory.deleteMany({ where: { request: { clientId: { in: ids } } } });
  await prisma.paymentRequest.deleteMany({ where: { clientId: { in: ids } } });
  await prisma.kycVerification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.account.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`\n✅ Deleted ${toDelete.length} user(s). Only the 7 RBAC test accounts remain.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
