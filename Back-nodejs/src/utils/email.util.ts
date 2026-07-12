import nodemailer from 'nodemailer';
import { getEmailTransporter } from '../config/email.config';
import { config } from '../config/app.config';
import { logger } from '../config/logger.config';

// ─── Generic send ─────────────────────────────────────────────────────────────

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = await getEmailTransporter();
    const info = await transporter.sendMail({
      from: `"Recruitment Platform" <${config.email.from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info('Email sent', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      // Only available from Ethereal — shows preview URL in dev logs
      previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
    });
  } catch (error) {
    logger.error('Email send failed', { error, to: options.to, subject: options.subject });
    throw new Error('Email delivery failed. Please try again later.');
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

/**
 * Account verification email — sent after registration.
 * Link expires in 24 hours (single-use).
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  rawToken: string
): Promise<void> {
  // Point directly to the backend API endpoint.
  // This avoids Gmail's link-safety proxy mangling localhost frontend URLs.
  // The backend verifies the token and redirects to the frontend login page.
  const verificationUrl = `${config.app.baseUrl}/api/auth/verify-email?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: '✉️ Verify your email — Recruitment Platform',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Recruitment Platform</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px">Email Verification</p>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi ${firstName} 👋</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        Welcome aboard! Please verify your email address to activate your account and start using the platform.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${verificationUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">
          Verify My Email
        </a>
      </div>
      <div style="background:#fafafa;border-radius:8px;padding:16px;margin-top:24px">
        <p style="margin:0;color:#888;font-size:13px;line-height:1.5">
          ⏰ This link expires in <strong>24 hours</strong> and can only be used once.<br>
          🔒 If you didn't create an account, safely ignore this email.
        </p>
      </div>
      <p style="margin:20px 0 0;color:#bbb;font-size:11px;word-break:break-all">
        Can't click the button? Copy this link:<br>${verificationUrl}
      </p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},\n\nVerify your email: ${verificationUrl}\n\nThis link expires in 24 hours.`,
  });
}

/**
 * Password reset email — sent on forgotten password request.
 * Link expires in 1 hour (single-use).
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  rawToken: string
): Promise<void> {
  const resetUrl = `${config.app.clientUrl}/auth/reset-password?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: '🔐 Reset your password — Recruitment Platform',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Password Reset</h1>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi ${firstName},</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        We received a request to reset your password. Click the button below to set a new one.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">
          Reset My Password
        </a>
      </div>
      <div style="background:#fff8e1;border-left:4px solid #ffc107;border-radius:4px;padding:16px;margin-top:16px">
        <p style="margin:0;color:#856404;font-size:13px;line-height:1.5">
          ⚠️ This link expires in <strong>1 hour</strong> and can only be used <strong>once</strong>.<br>
          If you did not request this, you can safely ignore this email — your password will remain unchanged.
        </p>
      </div>
      <p style="margin:20px 0 0;color:#bbb;font-size:11px;word-break:break-all">
        Can't click? Copy this link:<br>${resetUrl}
      </p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour and is single-use.`,
  });
}

/**
 * Password changed confirmation email — sent after successful reset.
 * Security: Alerts user of unexpected password changes.
 */
export async function sendPasswordChangedEmail(
  email: string,
  firstName: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🔑 Your password was changed — Recruitment Platform',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#11998e,#38ef7d);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Password Changed</h1>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi ${firstName},</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        Your password was successfully changed. All existing sessions have been logged out for security.
      </p>
      <div style="background:#ffebee;border-left:4px solid #f44336;border-radius:4px;padding:16px">
        <p style="margin:0;color:#c62828;font-size:13px">
          ⛔ <strong>If you did not make this change</strong>, your account may be compromised.
          Please contact support immediately.
        </p>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},\n\nYour password was changed. All sessions have been logged out.\n\nIf you did not make this change, contact support immediately.`,
  });
}

/**
 * Two-Factor Authentication code email — sent during login or 2FA setup.
 * Code expires in 5 minutes and is single-use.
 */
export async function sendTwoFactorCodeEmail(
  email: string,
  firstName: string,
  code: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: '🔐 Your verification code — Recruitment Platform',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Recruitment Platform</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">Two-Factor Verification</p>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px">Hi ${firstName} 👋</h2>
      <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6">
        Use the verification code below to complete your login. It expires in <strong>5 minutes</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:28px;text-align:center;margin:0 0 28px">
        <p style="margin:0 0 8px;color:rgba(255,255,255,.8);font-size:13px;letter-spacing:1px;text-transform:uppercase">Your Verification Code</p>
        <p style="margin:0;color:#fff;font-size:42px;font-weight:800;letter-spacing:12px">${code}</p>
      </div>
      <div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;padding:16px">
        <p style="margin:0;color:#856404;font-size:13px;line-height:1.6">
          ⏰ This code expires in <strong>5 minutes</strong> and can only be used <strong>once</strong>.<br>
          🔒 If you did not attempt to log in, please secure your account immediately.
        </p>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},\n\nYour verification code is: ${code}\n\nThis code expires in 5 minutes and is single-use.\n\nIf you did not attempt to log in, please secure your account immediately.`,
  });
}

/**
 * OAuth Verification code email — sent during OAuth login.
 * Code expires in 5 minutes and is single-use.
 */
export async function sendOauthVerificationEmail(
  email: string,
  firstName: string,
  code: string,
  tempToken: string
): Promise<void> {
  const verifyUrl = `${config.app.clientUrl}/#/auth/oauth/verify?tempToken=${tempToken}`;

  await sendEmail({
    to: email,
    subject: '🔐 Verify your login — Recruitment Platform',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#00c6ff,#0072ff);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Recruitment Platform</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">Login Verification</p>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px">Hi ${firstName} 👋</h2>
      <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6">
        To complete your secure login, please use the 6-digit verification code below. It expires in <strong>5 minutes</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#f5f7fa,#c3cfe2);border-radius:12px;padding:28px;text-align:center;margin:0 0 28px">
        <p style="margin:0 0 8px;color:#333;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Your Verification Code</p>
        <p style="margin:0;color:#0072ff;font-size:42px;font-weight:800;letter-spacing:12px">${code}</p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#00c6ff,#0072ff);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">
          Enter Verification Code
        </a>
      </div>
      <div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;padding:16px">
        <p style="margin:0;color:#856404;font-size:13px;line-height:1.6">
          ⏰ This code expires in <strong>5 minutes</strong> and can only be used <strong>once</strong>.<br>
          🔒 If you did not attempt to log in, please secure your account immediately.
        </p>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},\n\nYour verification code is: ${code}\n\nClick here to verify: ${verifyUrl}\n\nThis code expires in 5 minutes and is single-use.\n\nIf you did not attempt to log in, please secure your account immediately.`,
  });
}
