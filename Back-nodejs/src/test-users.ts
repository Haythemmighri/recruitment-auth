import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, email: true, role: true, isEmailVerified: true, createdAt: true }
  });
  console.log('Latest registered users:');
  console.log(users);
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
