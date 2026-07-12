const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'mighrihaythem5@gmail.com';
  await prisma.user.update({
    where: { email },
    data: {
      isEmailVerified: true,
      status: 'ACTIVE'
    }
  });
  console.log('Account manually verified!');
}

main().finally(() => prisma.$disconnect());
