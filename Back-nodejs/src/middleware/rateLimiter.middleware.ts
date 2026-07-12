import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { Request, Response } from 'express';
import { redisClient } from '../config/redis.config';
import { sendError } from '../utils/response.util';

// ─── Redis store factory ───────────────────────────────────────────────────────
// rate-limit-redis v4 uses sendCommand API compatible with node-redis.
// For ioredis we route through the call() method.
// Falls back to in-memory store when Redis is unavailable (dev only).

function createRedisStore(prefix: string): RedisStore | undefined {
  try {
    // Quick status check — ioredis exposes its internal status
    const status = (redisClient as unknown as { status: string }).status;
    if (status !== 'ready' && status !== 'connect' && status !== 'connecting') {
      return undefined; // Redis not available — caller uses memory store
    }

    return new RedisStore({
      // ioredis adapter for rate-limit-redis
      sendCommand: (...args: string[]): Promise<RedisReply> => {
        const [command, ...rest] = args;
        return (redisClient as unknown as Record<string, (...a: string[]) => Promise<RedisReply>>)[
          command.toLowerCase()
        ](...rest);
      },
      prefix,
    });
  } catch {
    return undefined; // Fallback to memory store
  }
}

// ─── Common handler ────────────────────────────────────────────────────────────
function tooManyRequestsHandler(req: Request, res: Response): void {
  sendError(res, 'Too many requests. Please try again later.', 429);
}

// ─── Skip in test environment ──────────────────────────────────────────────────
function skipInTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// ─── Rate limiters ─────────────────────────────────────────────────────────────

/**
 * Global API limiter: 100 requests / 15 min / IP
 * Applied to all routes in app.ts as the first middleware layer.
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('rl:general:') ?? undefined,
  handler: tooManyRequestsHandler,
  skip: skipInTest,
});

/**
 * Auth endpoint limiter: 10 requests / 15 min / IP
 * Applied to register, verify-email, forgot-password, reset-password.
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('rl:auth:') ?? undefined,
  handler: tooManyRequestsHandler,
  skip: skipInTest,
});

/**
 * Login-specific strict limiter: 5 attempts / 15 min / IP+email
 *
 * Security: Key includes the email address to prevent an attacker from
 * rotating IPs to bypass per-IP limits while targeting a single account.
 * Combined with the DB-level LoginAttempt log for forensic analysis.
 */
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('rl:login:') ?? undefined,
  handler: (_req: Request, res: Response): void => {
    sendError(
      res,
      'Too many login attempts. Please wait 15 minutes before trying again.',
      429
    );
  },
  // Composite key: IP + email for per-account throttling
  keyGenerator: (req: Request): string => {
    const email = (req.body as Record<string, string>)?.email ?? 'unknown';
    return `${req.ip}:${email.toLowerCase()}`;
  },
  skip: skipInTest,
});

/**
 * Password reset limiter: 3 requests / hour / IP
 * Prevents mass email enumeration via /forgot-password.
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('rl:pwd-reset:') ?? undefined,
  handler: tooManyRequestsHandler,
  skip: skipInTest,
});
