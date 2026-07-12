import request from 'supertest';
import { Role, UserStatus } from '@prisma/client';
import passport from 'passport';

// Mock passport BEFORE importing app to intercept passport.use() calls
jest.mock('passport', () => {
  const originalModule = jest.requireActual('passport');
  return {
    __esModule: true,
    ...originalModule,
    authenticate: jest.fn(),
    use: jest.fn(),  // Mock the .use() method to prevent errors during config loading
  };
});

// Now safe to import app (which imports passport.config.ts)
import { app } from '../../app';
import { prisma } from '../../config/database.config';

describe('Auth Integration: OAuth', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Google OAuth', () => {
    it('should create a new user on first Google login and issue tokens', async () => {
      // Setup the mock for this specific test
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any) => (req: any, res: any, next: any) => {
          if (strategy === 'google') {
            // Simulate passport having found/created the user and populated req.user
            req.user = { id: 'mock-google-user-id' };
            return next();
          }
          return next();
        }
      );

      // We need to seed the user first because oauthLogin expects the user to exist in the DB
      // (in reality, passport's findOrCreateOAuthUser does this, but since we mock passport.authenticate,
      // we must simulate the DB state it leaves behind)
      await prisma.user.create({
        data: {
          id: 'mock-google-user-id',
          firstName: 'Google',
          lastName: 'User',
          email: 'google@example.com',
          role: Role.CANDIDATE,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          googleId: 'google-12345',
        },
      });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .expect(302); // Expecting redirect to frontend with token

      // Check the redirect URL contains the access token
      expect(res.headers.location).toContain('token=');
      expect(res.headers.location).toContain('/auth/oauth/callback');

      // Check if refresh token cookie is set
      const cookies = (res.headers['set-cookie'] || []) as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toMatch(/HttpOnly/);
    });

    it('should issue tokens for an existing Google user', async () => {
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any) => (req: any, res: any, next: any) => {
          req.user = { id: 'existing-google-user' };
          return next();
        }
      );

      await prisma.user.create({
        data: {
          id: 'existing-google-user',
          firstName: 'Existing',
          lastName: 'Google',
          email: 'existing-google@example.com',
          role: Role.CANDIDATE,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          googleId: 'google-98765',
        },
      });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .expect(302);

      expect(res.headers.location).toContain('token=');
    });

    it('should reject login if user is suspended', async () => {
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any) => (req: any, res: any, next: any) => {
          req.user = { id: 'suspended-google-user' };
          return next();
        }
      );

      await prisma.user.create({
        data: {
          id: 'suspended-google-user',
          firstName: 'Suspended',
          lastName: 'User',
          email: 'suspended@example.com',
          role: Role.CANDIDATE,
          status: UserStatus.SUSPENDED,
          isEmailVerified: true,
          googleId: 'google-suspended',
        },
      });

      const res = await request(app)
        .get('/auth/oauth/google/callback')
        .expect(302);

      // Should redirect to error page
      expect(res.headers.location).toContain('error=Your%20account%20has%20been%20suspended');
    });
  });

  describe('GitHub OAuth', () => {
    it('should create a new user on first GitHub login and issue tokens', async () => {
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any) => (req: any, res: any, next: any) => {
          if (strategy === 'github') {
            req.user = { id: 'mock-github-user-id' };
            return next();
          }
          return next();
        }
      );

      await prisma.user.create({
        data: {
          id: 'mock-github-user-id',
          firstName: 'GitHub',
          lastName: 'User',
          email: 'github@example.com',
          role: Role.CANDIDATE,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          githubId: 'github-12345',
        },
      });

      const res = await request(app)
        .get('/auth/oauth/github/callback')
        .expect(302);

      expect(res.headers.location).toContain('token=');
    });
  });

  describe('LinkedIn OAuth', () => {
    it('should create a new user on first LinkedIn login and issue tokens', async () => {
      (passport.authenticate as jest.Mock).mockImplementation(
        (strategy: string, options: any) => (req: any, res: any, next: any) => {
          if (strategy === 'linkedin') {
            req.user = { id: 'mock-linkedin-user-id' };
            return next();
          }
          return next();
        }
      );

      await prisma.user.create({
        data: {
          id: 'mock-linkedin-user-id',
          firstName: 'LinkedIn',
          lastName: 'User',
          email: 'linkedin@example.com',
          role: Role.CANDIDATE,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          linkedinId: 'linkedin-12345',
        },
      });

      const res = await request(app)
        .get('/auth/oauth/linkedin/callback')
        .expect(302);

      expect(res.headers.location).toContain('token=');
    });
  });
});
