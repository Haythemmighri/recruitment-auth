import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';

import { prisma } from './database.config';
import { config } from './app.config';
import { logger } from './logger.config';
import { UserStatus, Role } from '@prisma/client';

// ─── Shared profile shape returned from each strategy ─────────────────────────

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// ─── Shared find-or-create logic ──────────────────────────────────────────────
// Called by every strategy after normalising the provider profile.
//
// Priority:
//   1. Find by provider-specific ID  → return existing user (fastest path)
//   2. Find by email                 → link provider ID to existing account
//   3. Neither found                 → create new ACTIVE user (provider verified email)

export type OAuthProvider = 'google' | 'github' | 'linkedin';

export async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  profile: OAuthProfile
): Promise<{ id: string; email: string; role: Role; status: UserStatus }> {

  // ─ 1. Look up by provider-specific ID ────────────────────────────────────
  let byProviderId: { id: string; email: string; role: Role; status: UserStatus } | null = null;

  if (provider === 'google') {
    byProviderId = await prisma.user.findUnique({
      where: { googleId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  } else if (provider === 'github') {
    byProviderId = await prisma.user.findUnique({
      where: { githubId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  } else {
    byProviderId = await prisma.user.findUnique({
      where: { linkedinId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  if (byProviderId) return byProviderId;

  // ─ 2. Look up by email — link provider ID if found ────────────────────────
  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, email: true, role: true, status: true },
  });

  if (byEmail) {
    // Auto-link provider to existing account using explicit field per provider
    if (provider === 'google') {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.id,
          ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        },
      });
    } else if (provider === 'github') {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          githubId: profile.id,
          ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          linkedinId: profile.id,
          ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        },
      });
    }
    logger.info(`[oauth] Linked ${provider} to existing account`, { userId: byEmail.id });
    return byEmail;
  }

  // ─ 3. Brand-new user — PENDING_APPROVAL so admin must activate before first login
  let newUser: { id: string; email: string; role: Role; status: UserStatus };

  const baseData = {
    firstName: profile.firstName,
    lastName:  profile.lastName,
    email:     profile.email,
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    role:            Role.CANDIDATE,
    status:          UserStatus.PENDING_APPROVAL,  // admin must activate
    isEmailVerified: true,           // OAuth provider verified the email
  };

  if (provider === 'google') {
    newUser = await prisma.user.create({
      data: { ...baseData, googleId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  } else if (provider === 'github') {
    newUser = await prisma.user.create({
      data: { ...baseData, githubId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  } else {
    newUser = await prisma.user.create({
      data: { ...baseData, linkedinId: profile.id },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  logger.info(`[oauth] Created new user via ${provider}`, { userId: newUser.id });
  return newUser;
}

// ─── Google Strategy ──────────────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
      {
        clientID:    config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: `${config.app.baseUrl}/auth/oauth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google profile'), undefined);
          }

          const user = await findOrCreateOAuthUser('google', {
            id:        profile.id,
            email,
            firstName: profile.name?.givenName   ?? profile.displayName.split(' ')[0] ?? 'User',
            lastName:  profile.name?.familyName  ?? profile.displayName.split(' ').slice(1).join(' ') ?? '',
          avatarUrl: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (err) {
        logger.error('[oauth] Google strategy error', { error: err });
        return done(err as Error, undefined);
      }
    }
  )
);

// ─── GitHub Strategy ──────────────────────────────────────────────────────────

passport.use(
  new GitHubStrategy(
    {
      clientID:     config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret,
      callbackURL:  `${config.app.baseUrl}/auth/oauth/github/callback`,
      scope: ['user:email'],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        // GitHub may return multiple emails — prefer the primary, verified one
        const emailEntry =
          (profile.emails as Array<{ value: string; primary?: boolean; verified?: boolean }> | undefined)
            ?.find((e) => e.primary && e.verified)
          ?? profile.emails?.[0];

        const email: string | undefined = emailEntry?.value ?? profile.email;
        if (!email) {
          return done(
            new Error('No verified email from GitHub. Please make your email public in your GitHub settings.'),
            undefined
          );
        }

        const displayName: string = profile.displayName || profile.username || 'GitHub User';
        const parts = displayName.split(' ');

        const user = await findOrCreateOAuthUser('github', {
          id:        String(profile.id),
          email,
          firstName: parts[0] ?? 'GitHub',
          lastName:  parts.slice(1).join(' ') || 'User',
          avatarUrl: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (err) {
        logger.error('[oauth] GitHub strategy error', { error: err });
        return done(err as Error, undefined);
      }
    }
  )
);

// ─── LinkedIn Strategy ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(LinkedInStrategy.prototype as any).userProfile = function(accessToken: string, done: (err: any, profile?: any) => void) {
  // Force the oauth2 client to send the token in the Authorization header
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self = this as any;
  self._oauth2.useAuthorizationHeaderforGET(true);
  // Ensure the query param name is reset just in case
  self._oauth2.setAccessTokenName('access_token');

  self._oauth2.get('https://api.linkedin.com/v2/userinfo', accessToken, function (err: any, body: any, _res: any) {
    if (err) {
      return done(new Error('failed to fetch user profile: ' + (err.data || err.message || err)));
    }
    try {
      const json = JSON.parse(body);
      const profile = {
        provider: 'linkedin',
        id: json.sub,
        displayName: `${json.given_name} ${json.family_name}`.trim(),
        name: {
          givenName: json.given_name,
          familyName: json.family_name,
        },
        emails: [{ value: json.email }],
        photos: [{ value: json.picture }],
        _raw: body,
        _json: json
      };
      done(null, profile);
    } catch(e) {
      done(new Error('failed to parse profile response'));
    }
  });
};

passport.use(
  new LinkedInStrategy(
    {
      clientID:     config.oauth.linkedin.clientId,
      clientSecret: config.oauth.linkedin.clientSecret,
      callbackURL:  `${config.app.baseUrl}/auth/oauth/linkedin/callback`,
      scope: ['openid', 'profile', 'email'],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        const email: string | undefined = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from LinkedIn profile'), undefined);
        }

        const user = await findOrCreateOAuthUser('linkedin', {
          id:        String(profile.id),
          email,
          firstName: profile.name?.givenName  ?? profile.displayName?.split(' ')[0] ?? 'User',
          lastName:  profile.name?.familyName ?? profile.displayName?.split(' ').slice(1).join(' ') ?? '',
          avatarUrl: profile.photos?.[0]?.value,
        });

        return done(null, user);
      } catch (err) {
        logger.error('[oauth] LinkedIn strategy error', { error: err });
        return done(err as Error, undefined);
      }
    }
  )
);

// No session serialization needed — using JWT (session: false in all routes)
