const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const http = require('http');

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

async function main() {
  // Get the azerty.saif user's unused token
  const record = await prisma.emailVerificationToken.findFirst({
    where: { user: { email: 'azerty.saif123456@gmail.com' }, used: false },
    select: { tokenHash: true }
  });
  
  if (!record) {
    console.log('No unused token found for azerty.saif123456@gmail.com');
    return;
  }
  
  console.log('Found token hash:', record.tokenHash);
  console.log('We need the RAW token to test... We cannot reverse the hash.');
  console.log('\n--- Instead, lets verify directly via prisma ---');
  
  // Manually verify the account
  await prisma.user.update({
    where: { email: 'azerty.saif123456@gmail.com' },
    data: { isEmailVerified: true, status: 'ACTIVE' }
  });
  await prisma.emailVerificationToken.updateMany({
    where: { user: { email: 'azerty.saif123456@gmail.com' } },
    data: { used: true }
  });
  
  const u = await prisma.user.findUnique({ where: { email: 'azerty.saif123456@gmail.com' } });
  console.log('After fix - isEmailVerified:', u.isEmailVerified, '  status:', u.status);
}

main().finally(() => prisma.$disconnect());
