import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// ─── XSS sanitization options ─────────────────────────────────────────────────
// Strip ALL HTML tags (we're an API, not a CMS).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const XSS_OPTIONS: any = {
  whiteList: {},           // No tags allowed at all
  stripIgnoreTag: true,    // Remove tags not in whitelist
  stripIgnoreTagBody: ['script', 'style', 'xml'],  // Also remove their content
};

/**
 * Recursively sanitize an unknown value against XSS injection.
 *
 * Strategy: strip all HTML. The API consumes plain text only.
 * Any HTML/JS found in input is a red flag and must be removed.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return xss(value, XSS_OPTIONS).trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeValue(v),
      ])
    );
  }

  // Primitives (numbers, booleans, null, undefined) pass through unchanged
  return value;
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * against XSS payloads before any business logic runs.
 *
 * Security note: This is a defense-in-depth measure. Primary protection
 * comes from Zod input validation which strictly types and rejects
 * unexpected values. This adds a second layer for any strings that
 * pass Zod validation.
 */
export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as typeof req.query;
  req.params = sanitizeValue(req.params) as typeof req.params;
  next();
}
