import { doubleCsrf } from 'csrf-csrf';
import { config } from '../config/app.config';

/**
 * CSRF Protection using the Double-Submit Cookie pattern.
 *
 * How it works:
 *  1. Client calls GET /auth/csrf-token → receives a CSRF token in the response
 *     AND as a cookie (set by generateToken).
 *  2. Client includes the token in the X-CSRF-Token header for state-changing
 *     requests (POST, PATCH, DELETE).
 *  3. doubleCsrfProtection middleware validates header matches cookie.
 *
 * Security rationale:
 *  - Cross-origin attackers can set cookies (via CSRF) but cannot READ them
 *    (SOP), so they cannot supply the correct header value.
 *  - This is complementary to SameSite=Strict (which already mitigates CSRF
 *    for the refresh token cookie). CSRF protection here adds defence-in-depth.
 *  - In pure SPA + Bearer token APIs, CSRF risk is minimal. This middleware
 *    is available but applied selectively — not globally.
 *
 * Apply to routes that use cookie-based auth (e.g., /auth/refresh, /auth/logout).
 */
export const {
  generateToken: generateCsrfToken,
  doubleCsrfProtection,
  validateRequest: validateCsrfRequest,
} = doubleCsrf({
  getSecret: () => config.csrf.secret,

  // Cookie name: __Host- prefix enforces Secure + no Domain + Path=/ in production
  cookieName:
    config.env === 'production' ? '__Host-csrf-token' : 'csrf-token',

  cookieOptions: {
    sameSite: 'strict',
    secure: config.env === 'production',
    httpOnly: true,
    path: '/',
  },

  size: 64,

  // Extract CSRF token from X-CSRF-Token header (standard) or _csrf body field
  getTokenFromRequest: (req) => {
    return (
      (req.headers['x-csrf-token'] as string) ||
      (req.body as Record<string, string>)?._csrf ||
      ''
    );
  },
});
