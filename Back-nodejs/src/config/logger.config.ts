import winston from 'winston';
import { config } from './app.config';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// ─── Development format: human-readable coloured output ───────────────────────
const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

// ─── Production format: structured JSON ───────────────────────────────────────
const productionFormat = combine(timestamp(), errors({ stack: true }), json());

// ─── Logger instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level:
    config.env === 'production'
      ? 'warn'
      : config.env === 'test'
        ? 'error' // Suppress noise during tests
        : 'debug',

  format:
    config.env === 'production' ? productionFormat : developmentFormat,

  transports: [
    new winston.transports.Console({
      silent: config.env === 'test', // Completely silent in tests
    }),
    // File transports only in production
    ...(config.env === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024,  // 10 MB
            maxFiles: 5,
            tailable: true,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 50 * 1024 * 1024,  // 50 MB
            maxFiles: 10,
            tailable: true,
          }),
        ]
      : []),
  ],

  // Global exception / rejection handlers (production)
  ...(config.env === 'production'
    ? {
        exceptionHandlers: [
          new winston.transports.File({ filename: 'logs/exceptions.log' }),
        ],
        rejectionHandlers: [
          new winston.transports.File({ filename: 'logs/rejections.log' }),
        ],
      }
    : {}),
});

// Add http level for Morgan integration
logger.levels = { ...winston.config.npm.levels, http: 5 };
