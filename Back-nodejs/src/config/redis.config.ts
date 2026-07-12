import Redis from 'ioredis';
import { config } from './app.config';
import { logger } from './logger.config';

// ─── Redis singleton ──────────────────────────────────────────────────────────
// ioredis auto-connects and auto-reconnects.
// Singleton pattern prevents multiple connections during hot-reload.

declare global {
  // eslint-disable-next-line no-var
  var __redisInstance: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(config.redis.url, {
    password: config.redis.password,
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,      // 10 seconds
    commandTimeout: 5_000,       // 5 seconds per command
    lazyConnect: true,           // Don't connect until first command
    enableOfflineQueue: true,    // Queue commands while reconnecting
    retryStrategy(times) {
      // In dev, stop quickly if Redis isn't installed — no need to spam logs
      const maxRetries = config.env === 'production' ? 20 : 3;
      if (times > maxRetries) {
        logger.warn('Redis: stopped retrying — not available (using in-memory fallbacks)');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 3000); // Exponential back-off capped at 3s
    },
  });

  client.on('connect', () =>
    logger.info('Redis: connected', { url: config.redis.url.replace(/:[^:@]+@/, ':***@') })
  );
  client.on('ready', () => logger.debug('Redis: ready'));
  client.on('error', (err: Error) =>
    logger.error('Redis: error', { message: err.message })
  );
  client.on('close', () => logger.warn('Redis: connection closed'));
  client.on('reconnecting', (delay: number) =>
    logger.info('Redis: reconnecting', { delay })
  );

  return client;
}

export const redisClient: Redis =
  global.__redisInstance ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  global.__redisInstance = redisClient;
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  logger.info('Redis disconnected');
}
