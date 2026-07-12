const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Show ALL users with verification status
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      email: true,
      firstName: true,
      isEmailVerified: true,
      status: true,
      createdAt: true,
    }
  });
  
  console.log('\n=== ALL USERS ===');
  users.forEach(u => {
    const ok = u.isEmailVerified && u.status === 'ACTIVE';
    console.log(`${ok ? '✅' : '❌'} ${u.email} | verified=${u.isEmailVerified} | status=${u.status}`);
  });
  
  // Fix ALL pending users so you can test without re-verifying
  const fixed = await prisma.user.updateMany({
    where: { isEmailVerified: false, status: 'PENDING_VERIFICATION' },
    data: { isEmailVerified: true, status: 'ACTIVE' }
  });
  console.log(`\n✅ Fixed ${fixed.count} unverified accounts.`);
  
  // Also mark all their tokens as used
  await prisma.emailVerificationToken.updateMany({
    where: { used: false },
    data: { used: true }
  });
  
  console.log('\n=== AFTER FIX ===');
  const after = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { email: true, isEmailVerified: true, status: true }
  });
  after.forEach(u => {
    const ok = u.isEmailVerified && u.status === 'ACTIVE';
    console.log(`${ok ? '✅' : '❌'} ${u.email}`);
  });
}

main().finally(() => prisma.$disconnect());
