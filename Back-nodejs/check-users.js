const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      email: true,
      isEmailVerified: true,
      status: true,
      createdAt: true,
      emailVerificationTokens: {
        select: { tokenHash: true, used: true, expiresAt: true }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
