import { Router } from 'express';
import { authController } from './auth.controller';
import { oauthController } from './oauth.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import {
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
} from '../../middleware/rateLimiter.middleware';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

/** Register a new user account */
router.post('/register', authLimiter, authController.register);

/** Verify email address via link from verification email */
router.get('/verify-email', authController.verifyEmail);

/** Login — returns access token + sets refresh token cookie */
router.post('/login', loginLimiter, authController.login);

/** Complete 2FA login with TOTP code + temporary token */
router.post('/2fa/verify', loginLimiter, authController.verifyTwoFactor);

/** Complete OAuth login with verification code + temporary token */
router.post('/oauth/verify-code', loginLimiter, authController.verifyOauthCode);

/** Request a password reset email */
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);

/** Reset password using token from email */
router.post('/reset-password', authLimiter, authController.resetPassword);

/** Rotate refresh token (reads from HttpOnly cookie) */
router.post('/refresh', authController.refreshToken);

/** Get a CSRF token (double-submit cookie pattern) */
router.get('/csrf-token', authController.getCsrfToken);

// ─── Protected routes (require valid Bearer access token) ─────────────────────

/** Logout — revokes refresh token + clears cookie */
router.post('/logout', authenticate, authController.logout);

/** Begin 2FA setup — returns QR code */
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);

/** Confirm 2FA setup with first valid code — activates 2FA */
router.post('/2fa/enable', authenticate, authController.enableTwoFactor);

/** Disable 2FA (requires current password + valid TOTP code) */
router.post('/2fa/disable', authenticate, authController.disableTwoFactor);

// ─── OAuth routes (GET — no CSRF header; state param provides CSRF protection) ────────

/** Redirect to Google consent screen */
router.get('/oauth/google', oauthController.google.initiate);
/** Google OAuth callback — exchanges code, creates/finds user, issues JWT */
router.get('/oauth/google/callback', ...oauthController.google.callback);

/** Redirect to GitHub authorization screen */
router.get('/oauth/github', oauthController.github.initiate);
/** GitHub OAuth callback */
router.get('/oauth/github/callback', ...oauthController.github.callback);

/** Redirect to LinkedIn authorization screen */
router.get('/oauth/linkedin', oauthController.linkedin.initiate);
/** LinkedIn OAuth callback */
router.get('/oauth/linkedin/callback', ...oauthController.linkedin.callback);

/** Developer mock OAuth login */
router.get('/oauth/:provider/mock', oauthController.mock);

export default router;
