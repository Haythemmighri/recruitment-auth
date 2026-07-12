const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE users MODIFY COLUMN status ENUM('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DELETED') DEFAULT 'PENDING_VERIFICATION'`);
  console.log("Enum updated successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
