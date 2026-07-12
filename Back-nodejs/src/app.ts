import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from 'passport';
import './config/passport.config'; // registers Google, GitHub, LinkedIn strategies

import { config } from './config/app.config';
import { logger } from './config/logger.config';

import { generalLimiter } from './middleware/rateLimiter.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import { doubleCsrfProtection } from './middleware/csrf.middleware';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import adminRoutes from './modules/admin/admin.routes';
import { sendError } from './utils/response.util';

export const app: Express = express();

// ─── 1. Security Headers (Helmet) ─────────────────────────────────────────────
// Sets 11 secure HTTP headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc)
app.use(helmet());

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
// Strictly configured CORS. In production, exact origin match required.
// credentials: true is required for the HttpOnly refresh token cookie to flow.
app.use(
  cors({
    origin: config.env === 'production' ? config.app.clientUrl : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// ─── 3. Global Rate Limiter ───────────────────────────────────────────────────
// Distributed Redis-backed rate limiting (100 req/15min)
app.use(generalLimiter);

// ─── 4. Parsers ───────────────────────────────────────────────────────────────
// Parse JSON body (with strict size limit to prevent payload-based DoS)
app.use(express.json({ limit: '10kb' }));
// Parse URL-encoded body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Parse cookies (required for refresh token and CSRF double-submit)
app.use(cookieParser(config.cookie.secret));

// ─── 5. Passport (OAuth) ────────────────────────────────────────────────────────────────────────
// Stateless — no session store needed (JWT handles auth state)
app.use(passport.initialize());

// ─── 5. Anti-XSS Payload Sanitizer ────────────────────────────────────────────
// Recursively strips HTML tags from body, query, and params before business logic
app.use(sanitizeInput);

// ─── 6. CSRF Protection ───────────────────────────────────────────────────────
// Double-submit cookie pattern. Bypassed for GET, HEAD, OPTIONS.
// Enforces X-CSRF-Token header presence on state-changing requests.
app.use(doubleCsrfProtection);

// ─── 7. Logging (Morgan) ──────────────────────────────────────────────────────
// HTTP request logger, piped into Winston
app.use(
  morgan(
    config.env === 'production' ? 'combined' : 'dev',
    {
      stream: { write: (message: string) => logger.http(message.trim()) },
      // Skip logging 200 OKs in test mode to keep output clean
      skip: () => config.env === 'test',
    }
  )
);

// ─── 8. Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Mount authRoutes on /auth as well to support legacy OAuth redirect URIs
// that were registered in Google/GitHub/LinkedIn consoles without the /api prefix.
app.use('/auth', authRoutes);

// Health check endpoint (bypasses CSRF intentionally if configured separately, but protected globally here)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── 9. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.url}`, 404);
});

// ─── 10. Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // CSRF validation failure from csrf-csrf middleware
  if ((err as any).code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF validation failed', { ip: req.ip, url: req.url });
    sendError(res, 'Invalid CSRF token', 403);
    return;
  }

  // Syntax error from express.json parser (e.g., malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON payload', 400);
    return;
  }

  // Unhandled internal errors
  logger.error('Unhandled Exception', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Never leak stack traces in production
  const message = config.env === 'production'
    ? 'Internal Server Error'
    : err.message;

  sendError(res, message, 500);
});
