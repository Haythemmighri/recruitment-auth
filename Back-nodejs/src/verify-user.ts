import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyUser() {
  await prisma.user.update({
    where: { email: 'nour.mighri000@gmail.com' },
    data: { isEmailVerified: true, status: UserStatus.ACTIVE }
  });
  console.log('User verified successfully!');
}

verifyUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
