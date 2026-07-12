import { Request, Response } from 'express';
import { ZodError } from 'zod';

import { authService, AuthError } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  twoFactorVerifySchema,
  twoFactorEnableSchema,
  twoFactorDisableSchema,
  oauthVerifySchema,
} from './auth.validators';
import { sendSuccess, sendError, sendCreated } from '../../utils/response.util';
import { auditLog, AuditEvents } from '../../middleware/auditLog.middleware';
import { config } from '../../config/app.config';
import { logger } from '../../config/logger.config';

// ─── Cookie configuration ─────────────────────────────────────────────────────
const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,                              // JS cannot read this cookie (XSS mitigation)
  secure: config.env === 'production',         // HTTPS-only in production
  sameSite: 'strict' as const,                 // CSRF mitigation
  maxAge: config.jwt.refreshExpiresMs,         // Matches token expiry
  path: '/',
  // domain is only set in production to avoid localhost issues
  ...(config.env === 'production' && {
    domain: config.cookie.domain,
  }),
};

// ─── Error handling helpers ───────────────────────────────────────────────────

function handleZodError(res: Response, error: ZodError): void {
  const errors: Record<string, string[]> = {};
  for (const issue of error.errors) {
    const field = issue.path.join('.') || 'root';
    if (!errors[field]) errors[field] = [];
    errors[field].push(issue.message);
  }
  sendError(res, 'Validation failed', 422, errors);
}

function handleAuthError(res: Response, error: AuthError): void {
  sendError(res, error.message, error.statusCode);
}

function handleUnexpectedError(
  res: Response,
  error: unknown,
  context: string
): void {
  logger.error(`[auth.controller] ${context}`, { error });
  sendError(res, 'An internal error occurred. Please try again.', 500);
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const authController = {
  // POST /auth/register
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);
      await auditLog(req, AuditEvents.USER_REGISTERED, undefined, {
        email: data.email,
        role: data.role,
      });
      sendCreated(res, null, result.message);
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'register');
    }
  },

  // GET /auth/verify-email?token=...
  // Called directly from the email link in a browser — must redirect, not return JSON
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const frontendLogin = `${config.app.clientUrl}/auth/login`;
    try {
      const { token } = verifyEmailSchema.parse(req.query);
      await authService.verifyEmail(token);
      await auditLog(req, AuditEvents.EMAIL_VERIFIED);
      // Redirect to login page with success flag so the UI can show a toast
      res.redirect(`${frontendLogin}?verified=true`);
    } catch (e) {
      let message = 'Verification failed. The link may be expired or already used.';
      if (e instanceof ZodError) {
        message = 'Invalid verification link.';
      } else if (e instanceof AuthError) {
        message = e.message;
      } else {
        logger.error('[auth.controller] verifyEmail unexpected error', { error: e });
      }
      // Redirect to login with error message so user can see what went wrong
      res.redirect(`${frontendLogin}?verify_error=${encodeURIComponent(message)}`);
    }
  },


  // POST /auth/login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
        ?? req.ip
        ?? '0.0.0.0';
      const ua = req.get('User-Agent') ?? 'unknown';

      const result = await authService.login(data, ip, ua);

      // 2FA required — return temp token only (no session tokens yet)
      if ('requiresTwoFactor' in result) {
        sendSuccess(res, {
          requiresTwoFactor: true,
          tempToken: result.tempToken,
        }, 'Two-factor authentication required');
        return;
      }

      // Full login — set refresh token in HttpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
      await auditLog(req, AuditEvents.USER_LOGIN);

      // Return ONLY the access token in body; refresh token lives in cookie
      sendSuccess(res, { accessToken: result.accessToken }, 'Login successful');
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'login');
    }
  },

  // POST /auth/2fa/verify
  async verifyTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, totpCode } = twoFactorVerifySchema.parse(req.body);
      const ip = req.ip ?? '0.0.0.0';
      const ua = req.get('User-Agent') ?? 'unknown';

      const result = await authService.verifyTwoFactor(tempToken, totpCode, ip, ua);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
      await auditLog(req, AuditEvents.TWO_FACTOR_LOGIN);
      sendSuccess(res, { accessToken: result.accessToken }, '2FA verification successful');
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'verifyTwoFactor');
    }
  },

  // POST /auth/oauth/verify-code
  async verifyOauthCode(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, code } = oauthVerifySchema.parse(req.body);
      const ip = req.ip ?? '0.0.0.0';
      const ua = req.get('User-Agent') ?? 'unknown';

      const result = await authService.verifyOauthCode(tempToken, code, ip, ua);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
      await auditLog(req, AuditEvents.USER_LOGIN);
      sendSuccess(res, { accessToken: result.accessToken }, 'OAuth verification successful');
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'verifyOauthCode');
    }
  },

  // POST /auth/refresh  (uses cookie — no Bearer header needed)
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

      if (!rawToken) {
        sendError(res, 'Refresh token not found. Please log in.', 401);
        return;
      }

      const ip = req.ip ?? '0.0.0.0';
      const ua = req.get('User-Agent') ?? 'unknown';

      const result = await authService.refreshToken(rawToken, ip, ua);

      // Set the NEW rotated refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
      await auditLog(req, AuditEvents.TOKEN_REFRESHED);
      sendSuccess(res, { accessToken: result.accessToken }, 'Token refreshed');
    } catch (e) {
      if (e instanceof AuthError) {
        // Clear the cookie on any refresh failure (force re-login)
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
        handleAuthError(res, e);
        return;
      }
      handleUnexpectedError(res, e, 'refreshToken');
    }
  },

  // POST /auth/logout  (requires valid access token)
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

      if (rawToken) {
        await authService.logout(rawToken);
      }

      // Always clear the cookie regardless of DB outcome
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      await auditLog(req, AuditEvents.USER_LOGOUT);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (e) {
      // Even on error, clear the cookie and return success
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      logger.error('[auth.controller] logout error', { error: e });
      sendSuccess(res, null, 'Logged out');
    }
  },

  // POST /auth/forgot-password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email);
      await auditLog(req, AuditEvents.PASSWORD_RESET_REQUESTED, undefined, { email });
      sendSuccess(res, null, result.message);
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      // ALWAYS return the safe message — never reveal if email exists
      logger.error('[auth.controller] forgotPassword error', { error: e });
      sendSuccess(
        res,
        null,
        'If that email is registered, you will receive a password reset link shortly.'
      );
    }
  },

  // POST /auth/reset-password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(token, newPassword);
      await auditLog(req, AuditEvents.PASSWORD_RESET);
      sendSuccess(res, null, result.message);
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'resetPassword');
    }
  },

  // POST /auth/2fa/setup  (requires valid access token)
  async setupTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        handleAuthError(res, new AuthError('User not authenticated'));
        return;
      }
      const result = await authService.setupTwoFactor(userId);
      await auditLog(req, AuditEvents.TWO_FACTOR_SETUP);
      sendSuccess(res, result, result.message);
    } catch (e) {
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'setupTwoFactor');
    }
  },

  // POST /auth/2fa/enable  (requires valid access token)
  async enableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { totpCode } = twoFactorEnableSchema.parse(req.body);
      const userId = (req.user as any)?.id;
      if (!userId) {
        handleAuthError(res, new AuthError('User not authenticated'));
        return;
      }
      const result = await authService.enableTwoFactor(userId, totpCode);
      await auditLog(req, AuditEvents.TWO_FACTOR_ENABLED);
      sendSuccess(res, null, result.message);
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'enableTwoFactor');
    }
  },

  // POST /auth/2fa/disable  (requires valid access token)
  async disableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { password } = twoFactorDisableSchema.parse(req.body);
      const userId = (req.user as any)?.id;
      if (!userId) {
        handleAuthError(res, new AuthError('User not authenticated'));
        return;
      }
      const result = await authService.disableTwoFactor(userId, password);
      await auditLog(req, AuditEvents.TWO_FACTOR_DISABLED);
      sendSuccess(res, null, result.message);
    } catch (e) {
      if (e instanceof ZodError) { handleZodError(res, e); return; }
      if (e instanceof AuthError) { handleAuthError(res, e); return; }
      handleUnexpectedError(res, e, 'disableTwoFactor');
    }
  },

  // GET /auth/csrf-token  (public — returns CSRF token for cookie + header pattern)
  async getCsrfToken(req: Request, res: Response): Promise<void> {
    try {
      const { generateCsrfToken } = await import('../../middleware/csrf.middleware');
      const token = generateCsrfToken(req, res);
      sendSuccess(res, { csrfToken: token }, 'CSRF token generated');
    } catch (e) {
      handleUnexpectedError(res, e, 'getCsrfToken');
    }
  },
};
