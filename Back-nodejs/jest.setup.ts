/**
 * Jest Environment Setup
 *
 * This file runs BEFORE the test framework (setupFiles) and BEFORE any test
 * module is imported. Setting env vars here guarantees app.config.ts reads
 * them correctly when the test file first imports the app.
 */

// Mock passport and OAuth strategy modules
jest.mock('passport', () => {
  const mockPassport = {
    use: jest.fn(),
    initialize: jest.fn(() => (req: any, res: any, next: any) => next()),
    session: jest.fn(() => (req: any, res: any, next: any) => next()),
    authenticate: jest.fn((strategy: string) => (req: any, res: any, next: any) => next()),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
  };
  return {
    __esModule: true,
    ...mockPassport,
    default: mockPassport,
  };
});

jest.mock('passport-google-oauth20');
jest.mock('passport-github2');
jest.mock('passport-linkedin-oauth2');

// Mock the passport config module so it doesn't try to register strategies
jest.mock('./src/config/passport.config', () => ({
  __esModule: true,
}));

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.APP_BASE_URL = 'http://localhost:3001';
process.env.CLIENT_URL = 'http://localhost:3001';

// Secrets (test-only values — never use in production)
process.env.JWT_ACCESS_SECRET =
  'test_access_secret_must_be_at_least_64_characters_long_for_security_reasons_abc';
process.env.JWT_REFRESH_SECRET =
  'test_refresh_secret_must_be_at_least_64_characters_long_for_security_reasons_xyz';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

process.env.COOKIE_SECRET = 'test_cookie_secret_32_chars_min!!';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.CSRF_SECRET = 'test_csrf_secret_32_chars_minimum!';

// Database — use dedicated test DB
process.env.DATABASE_URL = 'mysql://root:@localhost:3306/recruitment_auth_test';

// Redis — mock or skip for tests
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_PASSWORD = '';

// OAuth Dummy Credentials
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-client-secret';

// Email — mocked in tests, but config must be set
process.env.EMAIL_HOST = 'smtp.ethereal.email';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@ethereal.email';
process.env.EMAIL_PASS = 'testpass';
process.env.EMAIL_FROM = 'noreply@test.local';
