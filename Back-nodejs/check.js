const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: 'haythemmighri10@gmail.com' }
  });
  console.log('User status:', u);
}

main().finally(() => prisma.$disconnect());
