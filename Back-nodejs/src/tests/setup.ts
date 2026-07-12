import { prisma } from '../config/database.config';
import { redisClient } from '../config/redis.config';

// ─── Mock Nodemailer ──────────────────────────────────────────────────────────
// Prevents actual network requests during unit/integration testing.

jest.mock('../config/email.config', () => ({
  getEmailTransporter: jest.fn().mockResolvedValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id-123' }),
  }),
}));

// ─── Global Test Teardown ─────────────────────────────────────────────────────
// Ensures Prisma and Redis disconnect cleanly after all tests finish
// to prevent Jest from hanging (open handles warning).

afterAll(async () => {
  await prisma.$disconnect();
  try {
    await redisClient.quit();
  } catch (err) {
    // Redis may not be running in test environment
  }
});

// ─── Global Database Reset ────────────────────────────────────────────────────
// Cleans all tables between test suites.
// Supports both SQLite and MySQL database systems.

beforeAll(async () => {
  // Only execute if we are explicitly on the test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Safety catch: Tests are running against a non-test database!');
  }

  try {
    // Use Prisma to get all model names
    const models = Object.keys(prisma).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$')
    );

    for (const model of models) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any)[model].deleteMany({});
    }
  } catch (error) {
    console.error('Failed to reset database:', { error });
    // Continue anyway — some tests may still work
  }

  // Clear redis test data
  try {
    await redisClient.flushdb();
  } catch (err) {
    // Redis may not be running in test environment
  }
});
