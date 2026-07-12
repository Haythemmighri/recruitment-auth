import { sendSms } from '../../utils/sms.util';
import { Role, UserStatus } from '@prisma/client';

import { prisma } from '../../config/database.config';
import { redisClient } from '../../config/redis.config';
import { config } from '../../config/app.config';
import { logger } from '../../config/logger.config';

import { hashPassword, verifyPassword, getDummyHash } from '../../utils/password.util';
import { generateSecureToken, hashToken, generateUUID } from '../../utils/crypto.util';
import {
  signAccessToken,
  signRefreshToken,
  signTempToken,
  verifyRefreshToken,
  verifyTempToken,
} from '../../utils/token.util';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTwoFactorCodeEmail,
  sendOauthVerificationEmail,
} from '../../utils/email.util';

import type { RegisterInput, LoginInput } from './auth.validators';

// ─── Simple In-Memory Fallback for Redis (Development) ────────────────────────
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

async function setCache(key: string, ttlSeconds: number, value: string) {
  if (redisClient.status === 'ready') {
    await redisClient.setex(key, ttlSeconds, value);
  } else {
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

async function getCache(key: string): Promise<string | null> {
  if (redisClient.status === 'ready') {
    return await redisClient.get(key);
  } else {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }
}

async function delCache(key: string) {
  if (redisClient.status === 'ready') {
    await redisClient.del(key);
  } else {
    memoryStore.delete(key);
  }
}

// ─── Custom error ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// ─── Return types ─────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorPending {
  requiresTwoFactor: true;
  tempToken: string;
}

export interface OauthVerificationPending {
  requiresOauthVerification: true;
  tempToken: string;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  REGISTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async register(data: RegisterInput): Promise<{ message: string }> {
    // 1. Uniqueness checks (email and phone must both be unique)
    const [existingEmail, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone: data.phone }, select: { id: true } }),
    ]);

    if (existingEmail) {
      throw new AuthError('This email address is already registered', 409);
    }
    if (existingPhone) {
      throw new AuthError('This phone number is already registered', 409);
    }

    // 2. Hash password with Argon2id before any DB write
    const passwordHash = await hashPassword(data.password);

    // 3. Create user (status: PENDING_VERIFICATION — cannot log in until email verified)
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        status: UserStatus.PENDING_VERIFICATION,
      },
      select: { id: true, email: true, firstName: true },
    });

    // 4. Generate email verification token
    //    - 32 random bytes → 64 hex char token sent to user
    //    - Only SHA-256 hash stored in DB
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + config.security.emailTokenExpiresMs),
      },
    });

    // 5. Send verification email (non-fatal if email fails — user can request resend)
    try {
      await sendVerificationEmail(user.email, user.firstName, rawToken);
    } catch (err) {
      logger.error('Verification email delivery failed', { userId: user.id, error: err });
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VERIFY EMAIL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, status: true } },
      },
    });

    if (!record) throw new AuthError('Invalid verification token', 400);
    if (record.used) throw new AuthError('This verification link has already been used', 400);
    if (record.expiresAt < new Date()) {
      throw new AuthError(
        'Verification link has expired. Please request a new one.',
        400
      );
    }
    if (record.user.status === UserStatus.SUSPENDED) {
      throw new AuthError('Account is suspended. Contact support.', 403);
    }

    // Atomic: mark token used + activate account in a single transaction
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: {
          isEmailVerified: true,
          status: UserStatus.PENDING_APPROVAL,
        },
      }),
    ]);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LOGIN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async login(
    data: LoginInput,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair | TwoFactorPending> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        phone: true,
      },
    });

    // ── Timing-safe password check ────────────────────────────────────────────
    // We always run a password verification — even for non-existent users —
    // to prevent timing-based user enumeration attacks.
    // Without this, an attacker can distinguish "user not found" (fast) from
    // "wrong password" (slow argon2 check) by measuring response time.

    let passwordValid: boolean;
    if (user?.passwordHash) {
      passwordValid = await verifyPassword(user.passwordHash, data.password);
    } else {
      // Perform dummy argon2 verification to normalize response time
      const dummyHash = await getDummyHash();
      await verifyPassword(dummyHash, data.password);
      passwordValid = false;
    }

    // ── Record login attempt (for forensics & brute-force analysis) ───────────
    const logAttempt = (success: boolean, reason?: string) =>
      prisma.loginAttempt
        .create({
          data: {
            userId: user?.id ?? null,
            email: data.email,
            ipAddress,
            success,
            failureReason: reason ?? null,
          },
        })
        .catch(() => {}); // Swallow — don't block auth on log failures

    if (!user || !passwordValid) {
      await logAttempt(false, 'invalid_credentials');
      // Generic message — never reveal which part failed
      throw new AuthError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
      await logAttempt(false, 'email_not_verified');
      throw new AuthError(
        'Please verify your email address before logging in',
        403
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      await logAttempt(false, 'account_suspended');
      throw new AuthError('Your account has been suspended. Contact support.', 403);
    }

    if (user.status === UserStatus.PENDING_APPROVAL) {
      await logAttempt(false, 'account_pending_approval');
      throw new AuthError('Your account is pending admin approval', 403);
    }

    if (user.status !== UserStatus.ACTIVE) {
      await logAttempt(false, 'account_inactive');
      throw new AuthError('Account is not active', 403);
    }

    await logAttempt(true);

    // Update last-login timestamp (non-critical)
    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    // ── 2FA gating ────────────────────────────────────────────────────────────
    if (user.isTwoFactorEnabled) {
      const tempToken = signTempToken(user.id);
      return { requiresTwoFactor: true, tempToken };
    }

    return this.issueTokenPair(user.id, user.email, user.role, ipAddress, userAgent);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VERIFY 2FA (complete login)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async verifyTwoFactor(
    tempToken: string,
    totpCode: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair> {
    // 1. Verify temp token JWT signature
    let payload: { sub: string };
    try {
      payload = verifyTempToken(tempToken);
    } catch {
      throw new AuthError('Invalid or expired temporary token. Please log in again.', 401);
    }

    // 3. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isTwoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new AuthError('Two-factor authentication is not configured correctly', 400);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthError('Account is not active', 403);
    }

    // 4. Verify TOTP code
    const speakeasy = await import('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1, // Allow 30 seconds before/after
    });

    if (!isValid) {
      throw new AuthError('Invalid verification code. Please try again.', 401);
    }

    return this.issueTokenPair(user.id, user.email, user.role, ipAddress, userAgent);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  REFRESH TOKEN (rotation)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async refreshToken(
    rawToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair> {
    // 1. Verify JWT signature first (fast — no DB hit needed if signature fails)
    let payload: { sub: string; family: string };
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new AuthError('Invalid refresh token. Please log in again.', 401);
    }

    const tokenHash = hashToken(rawToken);

    // 2. Look up hashed token in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
      },
    });

    if (!stored) {
      // Token passed JWT verification but isn't in our DB.
      // This means it was already rotated out. This is a REUSE signal.
      // Revoke the entire token family to contain the compromise.
      logger.warn('Refresh token not found — possible theft, revoking family', {
        family: payload.family,
        userId: payload.sub,
        ipAddress,
      });
      await this.revokeTokenFamily(payload.family);
      throw new AuthError(
        'Session invalidated. Possible token theft detected. Please log in again.',
        401
      );
    }

    if (stored.revoked) {
      // Token was explicitly revoked (e.g., logout) but then resubmitted.
      // REUSE DETECTED — revoke entire family immediately.
      logger.warn('Revoked refresh token reused — COMPROMISE SIGNAL, revoking family', {
        family: payload.family,
        userId: stored.userId,
        ipAddress,
      });
      await this.revokeTokenFamily(payload.family);
      throw new AuthError(
        'Token reuse detected. All sessions revoked. Please log in again.',
        401
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new AuthError('Session expired. Please log in again.', 401);
    }

    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new AuthError('Account is not active', 403);
    }

    // 3. Rotate: revoke old token, issue new pair (same family)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      ipAddress,
      userAgent,
      payload.family // Keep same family for continued reuse detection
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LOGOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async logout(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);
    // updateMany is safe here — if token not found, it's a no-op
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  FORGOT PASSWORD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async forgotPassword(email: string): Promise<{ message: string }> {
    // ALWAYS return the same success message — prevents email enumeration.
    // An attacker must not be able to determine whether an email is registered.
    const SAFE_MESSAGE = {
      message:
        'If that email is registered, you will receive a password reset link shortly.',
    };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, status: true },
    });

    if (!user || user.status === UserStatus.DELETED) {
      return SAFE_MESSAGE;
    }

    // Invalidate any existing unused reset tokens (one active token at a time)
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + config.security.resetTokenExpiresMs),
      },
    });

    // Non-fatal email failure — return success anyway (no enumeration)
    try {
      await sendPasswordResetEmail(email, user.firstName, rawToken);
    } catch (err) {
      logger.error('Password reset email failed', { userId: user.id, error: err });
    }

    return SAFE_MESSAGE;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  RESET PASSWORD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async resetPassword(
    rawToken: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            status: true,
          },
        },
      },
    });

    if (!record) throw new AuthError('Invalid or expired reset token', 400);
    if (record.used) throw new AuthError('This reset link has already been used', 400);
    if (record.expiresAt < new Date()) {
      throw new AuthError(
        'Reset link has expired. Please request a new one.',
        400
      );
    }
    if (record.user.status === UserStatus.SUSPENDED) {
      throw new AuthError('Account is suspended. Contact support.', 403);
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Atomic transaction: mark token used, update password, revoke all sessions
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      }),
      // Security: Log out ALL existing sessions after password reset.
      // If the reset was triggered by an attacker, their stolen sessions
      // are now invalidated too.
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    try {
      await sendPasswordChangedEmail(record.user.email, record.user.firstName);
    } catch (err) {
      logger.error('Password changed email failed', { userId: record.userId });
    }

    return {
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2FA SETUP (returns success message)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async setupTwoFactor(userId: string): Promise<{
    data: { qrCodeDataUrl: string; secret: string };
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isTwoFactorEnabled: true },
    });

    if (!user) throw new AuthError('User not found', 404);
    if (user.isTwoFactorEnabled) {
      throw new AuthError('Two-factor authentication is already enabled', 409);
    }

    const speakeasy = await import('speakeasy');
    const QRCode = await import('qrcode');

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `RecruitAuth (${user.email})`,
    });

    // Store the secret TEMPORARILY in Redis until user confirms
    await setCache(
      `auth:2fa:setup:${userId}`,
      config.security.twoFactorSetupTtlSeconds,
      secret.base32
    );

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      data: {
        qrCodeDataUrl,
        secret: secret.base32,
      },
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2FA ENABLE (confirm setup with first code)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async enableTwoFactor(
    userId: string,
    totpCode: string
  ): Promise<{ message: string }> {
    // Retrieve the pending secret from Redis
    const pendingSecret = await getCache(`auth:2fa:setup:${userId}`);
    if (!pendingSecret) {
      throw new AuthError(
        'Two-factor setup session expired. Please restart setup from /auth/2fa/setup.',
        400
      );
    }

    const speakeasy = await import('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: pendingSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1, // Allow 30 seconds before/after
    });

    if (!isValid) {
      throw new AuthError(
        'Invalid verification code. Please try again.',
        401
      );
    }

    // Persist the 2FA active state and secret
    await prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: true,
        twoFactorSecret: pendingSecret,
      },
    });

    await delCache(`auth:2fa:setup:${userId}`);

    return { message: 'Two-factor authentication enabled successfully.' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  2FA DISABLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async disableTwoFactor(
    userId: string,
    password: string
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user) throw new AuthError('User not found', 404);
    if (!user.isTwoFactorEnabled) {
      throw new AuthError('Two-factor authentication is not enabled', 400);
    }

    // Require current password to disable
    if (!user.passwordHash) {
      throw new AuthError('Password-based authentication is not available for this account', 400);
    }

    const passwordValid = await verifyPassword(user.passwordHash, password);
    if (!passwordValid) throw new AuthError('Incorrect password', 401);

    await prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { message: 'Two-factor authentication disabled successfully.' };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  OAUTH LOGIN (social login — called after Passport strategy succeeds)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Complete an OAuth login: validate the user retrieved by a Passport strategy
   * and issue a JWT access + refresh token pair.
   *
   * Called by the OAuth controller after `passport.authenticate()` populates req.user.
   */
  async oauthLogin(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair | OauthVerificationPending> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new AuthError('User not found', 404);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AuthError('Your account has been suspended. Contact support.', 403);
    }

    if (user.status === UserStatus.DELETED) {
      throw new AuthError('Account not found.', 404);
    }



    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthError('Account is not active.', 403);
    }

    // Update last-login timestamp (non-critical)
    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    // Always require an email OTP after every OAuth login as an extra
    // identity verification step, regardless of whether the user has
    // explicitly enabled 2FA.
    const tempToken = signTempToken(user.id);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await setCache(
      `auth:oauth:code:${user.id}`,
      config.security.twoFactorPendingTtlSeconds,
      code
    );

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true },
    });
    await sendOauthVerificationEmail(user.email, fullUser?.firstName ?? 'User', code, tempToken);

    return { requiresOauthVerification: true, tempToken };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VERIFY OAUTH CODE (complete OAuth login)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async verifyOauthCode(
    tempToken: string,
    code: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = verifyTempToken(tempToken);
    } catch {
      throw new AuthError('Invalid or expired temporary token. Please log in again.', 401);
    }

    const pendingCode = await getCache(`auth:oauth:code:${payload.sub}`);
    if (!pendingCode) {
      throw new AuthError('Verification session expired. Please log in again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AuthError('User not found', 404);
    }

    if (code !== pendingCode) {
      throw new AuthError('Invalid verification code. Please try again.', 401);
    }

    if (user.status === UserStatus.PENDING_APPROVAL) {
      await delCache(`auth:oauth:code:${payload.sub}`);
      throw new AuthError(
        'Email verified successfully. Your account is pending activation by an administrator. You will be notified once approved.',
        403
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthError('Account is not active', 403);
    }

    await delCache(`auth:oauth:code:${payload.sub}`);

    return this.issueTokenPair(user.id, user.email, user.role, ipAddress, userAgent);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PRIVATE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Issue an access token + refresh token pair.
   * Creates a DB record for the refresh token (hashed).
   *
   * @param existingFamily - Pass when rotating to keep the same token family.
   *                         Pass undefined for a brand-new login session.
   */
  private async issueTokenPair(
    userId: string,
    email: string,
    role: Role,
    ipAddress: string,
    userAgent: string,
    existingFamily?: string
  ): Promise<TokenPair> {
    const family = existingFamily ?? generateUUID();
    const accessToken = signAccessToken(userId, email, role);
    const rawRefreshToken = signRefreshToken(userId, family);
    const refreshTokenHash = hashToken(rawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        family,
        expiresAt: new Date(Date.now() + config.jwt.refreshExpiresMs),
        ipAddress,
        userAgent: userAgent.substring(0, 500),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /**
   * Revoke all non-revoked tokens in a token family.
   * Called on theft detection (reuse signal).
   */
  private async revokeTokenFamily(family: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { family, revoked: false },
        data: { revoked: true },
      });
    } catch (err) {
      logger.error('Failed to revoke token family', { family, error: err });
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
