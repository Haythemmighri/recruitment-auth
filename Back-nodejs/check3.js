const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'mighrihaythem5@gmail.com';
  const u = await prisma.user.findUnique({ where: { email } });
  const t = await prisma.emailVerificationToken.findMany({ where: { user: { email } } });
  console.log('User:', u);
  console.log('Tokens:', t);
}

main().finally(() => prisma.$disconnect());
