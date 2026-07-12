import nodemailer, { Transporter } from 'nodemailer';
import { config } from './app.config';
import { logger } from './logger.config';

let _transporter: Transporter | null = null;

// ─── Development: Ethereal auto-account ───────────────────────────────────────
// Creates a free throw-away SMTP account automatically.
// All sent emails are captured and viewable at https://ethereal.email

async function createEtherealTransporter(): Promise<Transporter> {
  const testAccount = await nodemailer.createTestAccount();
  logger.info('Ethereal SMTP account created', {
    user: testAccount.user,
    previewUrl: 'https://ethereal.email',
  });
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

// ─── Production: configured SMTP ─────────────────────────────────────────────
function createConfiguredTransporter(): Transporter {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // TLS on port 465, STARTTLS on 587
    auth: { user: config.email.user, pass: config.email.pass },
    tls: {
      // Enforce certificate validation in production
      rejectUnauthorized: config.env === 'production',
    },
    pool: true,               // Connection pooling
    maxConnections: 5,
    maxMessages: 100,
  });
}

// ─── Lazy singleton getter ─────────────────────────────────────────────────────
export async function getEmailTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (config.env === 'development') {
    if (config.email.user) {
      logger.info('Using configured SMTP instead of Ethereal in development');
      _transporter = createConfiguredTransporter();
    } else {
      try {
        _transporter = await createEtherealTransporter();
      } catch (err) {
        logger.warn('Ethereal creation failed, falling back to configured SMTP', { err });
        _transporter = createConfiguredTransporter();
      }
    }
  } else if (config.env === 'test') {
    // In tests, email util is always mocked — this should never be called
    _transporter = createConfiguredTransporter();
  } else {
    _transporter = createConfiguredTransporter();
  }

  return _transporter;
}
