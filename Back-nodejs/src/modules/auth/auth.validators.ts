import { z } from 'zod';
import { Role } from '@prisma/client';

// ─── Reusable sub-schemas ─────────────────────────────────────────────────────

/**
 * Strong password policy:
 * - 8–128 characters
 * - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
 *
 * 128 char max prevents DoS via bcrypt/argon2 CPU exhaustion on
 * intentionally long passwords.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/,
    'Password must contain at least one special character (!@#$%^&* etc.)'
  );

/**
 * E.164-style international phone number.
 * +1234567890 through +123456789012345 (8–15 digits after optional +).
 */
const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[1-9]\d{7,14}$/,
    'Phone number must be 8–15 digits, optionally prefixed with +'
  );

const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

const nameSchema = (field: string) =>
  z
    .string()
    .min(2, `${field} must be at least 2 characters`)
    .max(100, `${field} must not exceed 100 characters`)
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      `${field} may only contain letters, spaces, hyphens, apostrophes, or periods`
    )
    .trim();

/** Six-digit numeric code sent via SMS */
const smsCodeSchema = z
  .string()
  .length(6, 'Verification code must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Verification code must contain only digits');

// ─── Exported schemas ─────────────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: nameSchema('First name'),
  lastName: nameSchema('Last name'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.nativeEnum(Role).optional().default(Role.CANDIDATE),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately relaxed — not applying policy here to avoid leaking
  // which character classes a user's password uses.
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required').max(256),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required').max(256),
});

export const twoFactorVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  totpCode: smsCodeSchema,
});

export const oauthVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  code: smsCodeSchema,
});

export const twoFactorEnableSchema = z.object({
  totpCode: smsCodeSchema,
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, 'Current password is required').max(256),
});

export const updateProfileSchema = z.object({
  firstName: nameSchema('First name').optional(),
  lastName: nameSchema('Last name').optional(),
  phone: phoneSchema.optional(),
});

// ─── Exported types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorEnableInput = z.infer<typeof twoFactorEnableSchema>;
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
