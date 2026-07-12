const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

async function testEndpoint() {
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  
  const user = await prisma.user.create({
    data: {
      firstName: 'Test', lastName: 'Test',
      email: `test-${Date.now()}@example.com`,
      passwordHash: 'dummy', phone: '123'
    }
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000)
    }
  });

  console.log('Hitting endpoint with rawToken:', rawToken);

  const req = http.request(`http://localhost:3000/api/auth/verify-email?token=${rawToken}`, {
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
      prisma.$disconnect();
    });
  });

  req.end();
}

testEndpoint().catch(console.error);
