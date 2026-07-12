import { PrismaClient } from '@prisma/client';
import { generateSecureToken, hashToken } from './utils/crypto.util';

const prisma = new PrismaClient();

async function generateResetLink() {
  const email = 'nour.mighri000@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found!');
    return;
  }

  // Invalidate any existing unused reset tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  console.log('--- PASSWORD RESET LINK ---');
  console.log(`http://localhost:4200/reset-password?token=${rawToken}`);
  console.log('---------------------------');
}

generateResetLink()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
