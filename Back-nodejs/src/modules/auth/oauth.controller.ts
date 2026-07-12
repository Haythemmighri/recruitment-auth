import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

import { authService, AuthError } from './auth.service';
import { auditLog, AuditEvents } from '../../middleware/auditLog.middleware';
import { config } from '../../config/app.config';
import { logger } from '../../config/logger.config';
import { findOrCreateOAuthUser, OAuthProvider } from '../../config/passport.config';

// ─── Cookie config (mirrors auth.controller.ts) ───────────────────────────────
const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'lax' as const, // 'lax' (not 'strict') so the cookie survives the provider redirect
  maxAge: config.jwt.refreshExpiresMs,
  path: '/',
  ...(config.env === 'production' && {
    domain: config.cookie.domain,
  }),
};

// ─── Redirect targets ─────────────────────────────────────────────────────────
const CLIENT_CALLBACK = `${config.app.clientUrl}/#/auth/oauth/callback`;
const CLIENT_ERROR    = `${config.app.clientUrl}/#/login`;

// ─── Generic callback handler ─────────────────────────────────────────────────
// Shared by all three provider callbacks — called after Passport has populated
// req.user with the find-or-created DB user.

async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const oauthUser = req.user as { id: string } | undefined;

    logger.info('[oauth-debug] handleOAuthCallback invoked', { 
      hasUser: !!oauthUser,
      userId: oauthUser?.id,
      url: req.url,
      query: req.query 
    });

    if (!oauthUser) {
      logger.warn('[oauth] Callback reached without req.user');
      res.redirect(`${CLIENT_ERROR}?error=oauth_failed`);
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      ?? req.ip
      ?? '0.0.0.0';
    const ua = req.get('User-Agent') ?? 'unknown';

    const loginResult = await authService.oauthLogin(oauthUser.id, ip, ua);

    await auditLog(req, AuditEvents.USER_LOGIN);

    if ('requiresOauthVerification' in loginResult) {
      res.redirect(`${config.app.clientUrl}/#/auth/oauth/verify?tempToken=${encodeURIComponent(loginResult.tempToken)}`);
      return;
    }

    const { accessToken, refreshToken } = loginResult;

    // Set the refresh token in an HttpOnly cookie (same as regular login)
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    logger.info('[oauth-debug] Redirecting to client callback', { url: CLIENT_CALLBACK });

    // Redirect to frontend with the access token as a query param.
    // The frontend should immediately read it from the URL, store it in memory,
    // then clear the URL param to avoid leaking it in browser history.
    res.redirect(`${CLIENT_CALLBACK}?token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    if (err instanceof AuthError) {
      logger.warn('[oauth] AuthError in callback', { message: err.message });
      res.redirect(`${CLIENT_ERROR}?error=${encodeURIComponent(err.message)}`);
      return;
    }
    logger.error('[oauth] Unexpected error in callback', { error: err });
    res.redirect(`${CLIENT_ERROR}?error=oauth_failed`);
  }
}

// ─── Provider-specific middleware ─────────────────────────────────────────────
// Each returns [initiateMiddleware, callbackMiddleware] for use in the router.

function googleMiddleware() {
  return {
    initiate: passport.authenticate('google', {
      session: false,
      scope: ['profile', 'email'],
    }),
    callback: [
      passport.authenticate('google', {
        session: false,
        failureRedirect: `${CLIENT_ERROR}?error=google_auth_failed`,
      }),
      handleOAuthCallback,
    ] as Array<(req: Request, res: Response, next: NextFunction) => void>,
  };
}

function githubMiddleware() {
  return {
    initiate: passport.authenticate('github', {
      session: false,
      scope: ['user:email'],
    }),
    callback: [
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('[oauth-debug] GitHub callback hit', { query: req.query, url: req.url });
        passport.authenticate('github', {
          session: false,
          failureRedirect: `${CLIENT_ERROR}?error=github_auth_failed`,
        })(req, res, next);
      },
      handleOAuthCallback,
    ] as Array<(req: Request, res: Response, next: NextFunction) => void>,
  };
}

function linkedinMiddleware() {
  return {
    initiate: passport.authenticate('linkedin', {
      session: false,
      // state is supported by passport-linkedin-oauth2 for CSRF protection
      // but not in @types/passport AuthenticateOptions — cast to bypass
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    callback: [
      passport.authenticate('linkedin', {
        session: false,
        failureRedirect: `${CLIENT_ERROR}?error=linkedin_auth_failed`,
      }),
      handleOAuthCallback,
    ] as Array<(req: Request, res: Response, next: NextFunction) => void>,
  };
}

async function handleMockOAuth(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider as OAuthProvider;
  if (!['google', 'github', 'linkedin'].includes(provider)) {
    logger.warn('[oauth] Invalid mock provider requested', { provider });
    res.redirect(`${CLIENT_ERROR}?error=invalid_provider`);
    return;
  }

  try {
    const rand = Math.random().toString(36).substring(2, 9);
    const mockProfile = {
      id: `mock-${provider}-${rand}`,
      email: `mock-${provider}-${rand}@example.com`,
      firstName: `Mock`,
      lastName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      avatarUrl: `https://avatars.githubusercontent.com/u/9919?v=4`,
    };

    const user = await findOrCreateOAuthUser(provider, mockProfile);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '0.0.0.0';
    const ua = req.get('User-Agent') ?? 'unknown';

    const loginResult = await authService.oauthLogin(user.id, ip, ua);

    await auditLog(req, AuditEvents.USER_LOGIN);

    if ('requiresOauthVerification' in loginResult) {
      res.redirect(`${config.app.clientUrl}/#/auth/oauth/verify?tempToken=${encodeURIComponent(loginResult.tempToken)}`);
      return;
    }

    const { accessToken, refreshToken } = loginResult;

    // Set the refresh token in an HttpOnly cookie (same as regular login)
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    // Redirect to frontend with the access token as a query param.
    res.redirect(`${CLIENT_CALLBACK}?token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    if (err instanceof AuthError) {
      logger.warn('[oauth] AuthError in mock callback', { message: err.message });
      res.redirect(`${CLIENT_ERROR}?error=${encodeURIComponent(err.message)}`);
      return;
    }
    logger.error('[oauth] Unexpected error in mock callback', { error: err });
    res.redirect(`${CLIENT_ERROR}?error=mock_failed`);
  }
}

export const oauthController = {
  google:   googleMiddleware(),
  github:   githubMiddleware(),
  linkedin: linkedinMiddleware(),
  mock:     handleMockOAuth,
};
