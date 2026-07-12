import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/token.util';
import { sendError } from '../utils/response.util';

/**
 * Authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies the JWT
 * signature and expiry, then populates `req.user` for downstream handlers.
 *
 * Security decisions:
 * - Rejects missing / malformed Authorization header immediately.
 * - Returns specific 401 sub-codes so the client can differentiate
 *   "expired token" (needs refresh) from "invalid token" (needs re-login).
 * - Does NOT touch cookies here — refresh-token cookie handling is in
 *   the /auth/refresh endpoint only.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    sendError(res, 'Authorization header is required', 401);
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authorization header must use Bearer scheme', 401);
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    sendError(res, 'Access token is required', 401);
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      sendError(res, 'Access token has expired. Please refresh.', 401);
    } else if (error instanceof JsonWebTokenError) {
      sendError(res, 'Invalid access token', 401);
    } else {
      sendError(res, 'Authentication failed', 401);
    }
  }
}
