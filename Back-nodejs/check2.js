const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.emailVerificationToken.findMany({
    where: { user: { email: 'haythemmighri10@gmail.com' } }
  });
  console.log('Tokens:', t);
}

main().finally(() => prisma.$disconnect());
