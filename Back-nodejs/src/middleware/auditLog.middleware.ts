import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.config';
import { logger } from '../config/logger.config';

// ─── Audit event constants ────────────────────────────────────────────────────
// Using string constants prevents typos in event names across the codebase.
export const AuditEvents = {
  USER_REGISTERED: 'USER_REGISTERED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  TWO_FACTOR_SETUP: 'TWO_FACTOR_SETUP',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_LOGIN: 'TWO_FACTOR_LOGIN',
  TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
  ADMIN_USER_STATUS_CHANGED: 'ADMIN_USER_STATUS_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
} as const;

export type AuditEventType = (typeof AuditEvents)[keyof typeof AuditEvents];

// ─── Core audit function ──────────────────────────────────────────────────────

/**
 * Append an immutable audit log entry.
 *
 * Security design:
 * - Failures are swallowed (logged to console only) — audit log failures
 *   must NEVER break the main authentication flow.
 * - The log table should be protected at DB level (INSERT-only permissions)
 *   in production to prevent tampering.
 * - IP and User-Agent are captured for forensic analysis.
 *
 * @param req - Express request (for IP, UA extraction)
 * @param event - Audit event type constant
 * @param userId - Optional override; falls back to req.user.id
 * @param metadata - Arbitrary structured event-specific data
 */
export async function auditLog(
  req: Request,
  event: AuditEventType | string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event,
        userId: userId ?? req.user?.id ?? null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
          req.ip ??
          req.socket.remoteAddress ??
          null,
        userAgent: req.get('User-Agent')?.substring(0, 500) ?? null,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  } catch (error) {
    // Never block the main flow on audit log failure
    logger.error('Audit log write failed', { event, userId, error });
  }
}

// ─── Route-level audit middleware factory ────────────────────────────────────

/**
 * Create an Express middleware that logs an audit event AFTER a successful
 * response is sent (status < 400).
 *
 * Usage:
 *   router.post('/logout', authenticate, auditRouteMiddleware('USER_LOGOUT'), handler)
 */
export function auditRouteMiddleware(
  event: AuditEventType | string,
  getMetadata?: (req: Request) => Record<string, unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      if (res.statusCode < 400) {
        // Fire and forget — don't await
        auditLog(req, event, req.user?.id, getMetadata?.(req)).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}
