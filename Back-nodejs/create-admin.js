// Script to create an Admin user in the database (works across all 3 backends)
// Usage: node create-admin.js

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ── CHANGE THESE ──────────────────────────────────────
const ADMIN_EMAIL     = 'admin@recruitauth.com';
const ADMIN_PASSWORD  = 'Admin@123456';
const ADMIN_FIRSTNAME = 'Super';
const ADMIN_LASTNAME  = 'Admin';
// ──────────────────────────────────────────────────────

function generateCuid() {
  return 'c' + crypto.randomBytes(16).toString('hex');
}

async function main() {
  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    // Promote existing user to ADMIN + ACTIVE
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    });
    console.log(`\n✅ User "${ADMIN_EMAIL}" promoted to ADMIN and activated.`);
    console.log(`   Password unchanged — use your existing password.\n`);
    return;
  }

  // Hash with Argon2id (same as all three backends)
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await prisma.user.create({
    data: {
      id:              generateCuid(),
      firstName:       ADMIN_FIRSTNAME,
      lastName:        ADMIN_LASTNAME,
      email:           ADMIN_EMAIL,
      passwordHash:    passwordHash,
      role:            'ADMIN',
      status:          'ACTIVE',
      isEmailVerified: true,
    },
  });

  console.log('\n✅ Admin user created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('─────────────────────────────────────');
  console.log('   You can now log in on any of the 3 backends!');
  console.log('   ⚠️  Change this password after first login.\n');
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message, '\n'); process.exit(1); })
  .finally(() => prisma.$disconnect());
