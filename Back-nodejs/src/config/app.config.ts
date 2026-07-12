import dotenv from 'dotenv';
import path from 'path';

// In non-test environments, load the .env file from project root
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// ─── Validation ───────────────────────────────────────────────────────────────
// Fail fast at startup if any required variable is missing.

const required = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_SECRET',
  'DATABASE_URL',
] as const;

if (process.env.NODE_ENV !== 'test') {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(
        `[config] Missing required environment variable: ${key}\n` +
          'Copy .env.example to .env and fill in all values.'
      );
    }
  }

  // Enforce minimum secret length to prevent weak secrets in production
  const JWT_ACCESS = process.env.JWT_ACCESS_SECRET!;
  const JWT_REFRESH = process.env.JWT_REFRESH_SECRET!;
  if (JWT_ACCESS.length < 32 || JWT_REFRESH.length < 32) {
    throw new Error('[config] JWT secrets must be at least 32 characters.');
  }
  if (JWT_ACCESS === JWT_REFRESH) {
    throw new Error('[config] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  }
}

// ─── Exported config object ───────────────────────────────────────────────────

export const config = {
  env: (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test',

  port: parseInt(process.env.PORT || '3000', 10),

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    /** Refresh token TTL in milliseconds (for cookie maxAge and DB expiry) */
    refreshExpiresMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@recruitment.local',
  },

  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret_32_chars_min!!',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    // Twilio
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    // Africa's Talking
    atApiKey:   process.env.AT_API_KEY || '',
    atUsername: process.env.AT_USERNAME || '',
    atSenderId: process.env.AT_SENDER_ID || '',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    },
  },

  csrf: {
    secret: process.env.CSRF_SECRET || 'dev_csrf_secret_32_chars_minimum!',
  },

  security: {
    /** Argon2id parameters — tuned for ~200ms on modern hardware */
    argon2: {
      memoryCost: 65536,  // 64 MB RAM
      timeCost: 3,        // 3 iterations
      parallelism: 4,     // 4 threads
    },
    /** Email verification link lifetime */
    emailTokenExpiresMs: 24 * 60 * 60 * 1000,   // 24 hours
    /** Password reset link lifetime */
    resetTokenExpiresMs: 60 * 60 * 1000,          // 1 hour
    /** Pending 2FA session lifetime in Redis */
    twoFactorPendingTtlSeconds: 300,               // 5 minutes
    /** Pending 2FA setup secret lifetime in Redis */
    twoFactorSetupTtlSeconds: 600,                 // 10 minutes
  },
} as const;

export type Config = typeof config;
