import { PrismaClient } from '@prisma/client';
import { logger } from './logger.config';

// ─── Prisma singleton ─────────────────────────────────────────────────────────
// Prevents multiple Prisma instances during hot-reload in development.
// Jest clears module cache between test suites, so each suite gets a fresh
// instance — the global guard prevents duplicate connections.

declare global {
  // eslint-disable-next-line no-var
  var __prismaInstance: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // Log slow queries and errors in development
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  global.__prismaInstance ?? createPrismaClient();

// Cache for non-production environments (dev + test hot-reload safety)
if (process.env.NODE_ENV !== 'production') {
  global.__prismaInstance = prisma;
}

// Graceful disconnect hook (called from server.ts)
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
