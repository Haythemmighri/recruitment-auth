const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const http = require('http');

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

async function main() {
  // Create a fresh test user with a known token so we can test the full e2e
  const email = `verify-test-${Date.now()}@gmail.com`;
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);

  const user = await prisma.user.create({
    data: {
      firstName: 'Verify', lastName: 'Test',
      email,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy', // dummy - not needed for this test
      phone: `+21698${Math.floor(Math.random() * 999999).toString().padStart(6,'0')}`
    }
  });

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86400000) }
  });

  // Now simulate what the browser does when it hits the verify-email page
  // The Angular app calls: GET http://localhost:3000/api/auth/verify-email?token=RAW_TOKEN
  console.log('Testing token:', rawToken.substring(0, 20) + '...');
  
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/auth/verify-email?token=${rawToken}`,
    method: 'GET',
    headers: { 'Origin': 'http://localhost:4200' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      
      // Check DB state after
      const u = await prisma.user.findUnique({ 
        where: { email },
        select: { isEmailVerified: true, status: true }
      });
      console.log('DB after verification:', u);
      
      // Cleanup
      await prisma.user.delete({ where: { email } });
      await prisma.$disconnect();
    });
  });
  req.end();
}

main().catch(console.error);
