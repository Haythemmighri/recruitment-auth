import { app } from './app';
import { config } from './config/app.config';
import { logger } from './config/logger.config';
import { prisma, disconnectDb } from './config/database.config';
import { redisClient, disconnectRedis } from './config/redis.config';

// ─── Startup Verification ─────────────────────────────────────────────────────

async function verifyConnections(): Promise<void> {
  // 1. Verify MySQL/Prisma connection — REQUIRED, hard-fail if down
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected and verified');
  } catch (error) {
    logger.error('Failed to connect to database during startup', { error });
    process.exit(1);
  }

  // 2. Verify Redis connection — OPTIONAL in development, warn and continue if down
  try {
    await redisClient.ping();
    logger.info('Redis connected and verified');
  } catch (error) {
    if (config.env === 'production') {
      logger.error('Redis unavailable in production — aborting startup', { error });
      process.exit(1);
    }
    logger.warn(
      '⚠️  Redis unavailable — rate limiters will fall back to in-memory store (dev only). ' +
      'Start Redis to enable distributed rate limiting.'
    );
  }
}

// ─── Server Initialization ────────────────────────────────────────────────────

async function startServer(): Promise<void> {
  await verifyConnections();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Server running in ${config.env} mode on port ${config.port}`);
    logger.info(`🌐 Base URL: ${config.app.baseUrl}`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  // Ensures existing requests complete before the Node process exits.

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async (err) => {
      if (err) {
        logger.error('Error during server closure', { err });
        process.exit(1);
      }

      logger.info('HTTP server closed.');

      try {
        await Promise.all([disconnectDb(), disconnectRedis()]);
        logger.info('Graceful shutdown complete. Exiting.');
        process.exit(0);
      } catch (cleanupErr) {
        logger.error('Error during resource cleanup', { error: cleanupErr });
        process.exit(1);
      }
    });

    // Force kill if graceful shutdown takes longer than 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server (only if not running in test mode)
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Fatal startup error', { error: err });
    process.exit(1);
  });
}

// Global catch-all for unhandled asynchronous errors
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection', { error: reason });
  // Don't exit immediately in dev, but in prod you generally want to crash and let orchestrator restart
  if (config.env === 'production') process.exit(1);
});

// Global catch-all for uncaught synchronous errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1); // Always exit on uncaught exception to avoid undefined state
});
