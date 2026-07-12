import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/app.config';
import { Role } from '@prisma/client';

// ─── Payload interfaces ───────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;      // User ID
  email: string;
  role: Role;
  jti: string;      // JWT ID — unique per token (replay prevention)
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;      // User ID
  family: string;   // Token family UUID (reuse detection)
  jti: string;
  iat: number;
  exp: number;
}

export interface TempTokenPayload {
  sub: string;        // User ID
  purpose: 'two_factor';
  iat: number;
  exp: number;
}

// ─── Signing helpers ──────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token (15 minutes default).
 *
 * Security: Access token is returned in the response body and stored in
 * JavaScript memory by the client (NOT localStorage, NOT cookie).
 * XSS can access memory, but the 15-min TTL limits the damage window.
 */
export function signAccessToken(
  userId: string,
  email: string,
  role: Role
): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { sub: userId, email, role, jti },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn as any, algorithm: 'HS256' }
  );
}

/**
 * Sign a long-lived refresh token (7 days default).
 *
 * Security: Stored in an HttpOnly, Secure, SameSite=Strict cookie.
 * The raw token is hashed (SHA-256) before DB storage — a DB breach
 * does not expose usable refresh tokens.
 *
 * @param family - UUID grouping tokens from the same login session.
 *                 Reuse of a revoked token triggers revocation of the
 *                 entire family (compromise signal).
 */
export function signRefreshToken(userId: string, family: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { sub: userId, family, jti },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any, algorithm: 'HS256' }
  );
}

/**
 * Sign a short-lived temporary token for pending 2FA verification (5 min).
 *
 * This token is returned when login succeeds but 2FA is pending.
 * It is single-use: Redis tracks whether it has been consumed.
 */
export function signTempToken(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: 'two_factor' },
    config.jwt.accessSecret,
    { expiresIn: '5m', algorithm: 'HS256' }
  );
}

// ─── Verification helpers ─────────────────────────────────────────────────────

/**
 * Verify and decode an access token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret, {
    algorithms: ['HS256'],
  }) as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret, {
    algorithms: ['HS256'],
  }) as RefreshTokenPayload;
}

/**
 * Verify and decode a temporary 2FA token.
 */
export function verifyTempToken(token: string): TempTokenPayload {
  const payload = jwt.verify(token, config.jwt.accessSecret, {
    algorithms: ['HS256'],
  }) as TempTokenPayload;

  if (payload.purpose !== 'two_factor') {
    throw new Error('Invalid token purpose');
  }

  return payload;
}
