<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    private function sendEmail(string $to, string $subject, string $html, string $text): void
    {
        try {
            Mail::html($html, function ($message) use ($to, $subject, $text) {
                $message->to($to)
                    ->subject($subject)
                    ->text($text);
            });
            Log::info('Email sent', ['to' => $to, 'subject' => $subject]);
        } catch (\Throwable $e) {
            Log::error('Email send failed', ['error' => $e->getMessage(), 'to' => $to, 'subject' => $subject]);
            throw new \Exception('Email delivery failed. Please try again later.');
        }
    }

    public function sendVerificationEmail(string $email, string $firstName, string $rawToken): void
    {
        $verificationUrl = env('APP_URL') . "/api/auth/verify-email?token={$rawToken}";
        
        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Recruitment Platform</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px">Email Verification</p>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi {$firstName} 👋</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        Welcome aboard! Please verify your email address to activate your account and start using the platform.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{$verificationUrl}"
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
        Can't click the button? Copy this link:<br>{$verificationUrl}
      </p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
HTML;

        $text = "Hi {$firstName},\n\nVerify your email: {$verificationUrl}\n\nThis link expires in 24 hours.";

        $this->sendEmail($email, '✉️ Verify your email — Recruitment Platform', $html, $text);
    }

    public function sendPasswordResetEmail(string $email, string $firstName, string $rawToken): void
    {
        $resetUrl = env('CLIENT_URL') . "/#/auth/reset-password?token={$rawToken}";
        
        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#f093fb,#f5576c);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Password Reset</h1>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi {$firstName},</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        We received a request to reset your password. Click the button below to set a new one.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="{$resetUrl}"
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
        Can't click? Copy this link:<br>{$resetUrl}
      </p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="margin:0;color:#bbb;font-size:11px">© 2024 Recruitment Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
HTML;

        $text = "Hi {$firstName},\n\nReset your password: {$resetUrl}\n\nThis link expires in 1 hour and is single-use.";

        $this->sendEmail($email, '🔐 Reset your password — Recruitment Platform', $html, $text);
    }

    public function sendPasswordChangedEmail(string $email, string $firstName): void
    {
        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#11998e,#38ef7d);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Password Changed</h1>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi {$firstName},</h2>
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
</html>
HTML;

        $text = "Hi {$firstName},\n\nYour password was changed. All sessions have been logged out.\n\nIf you did not make this change, contact support immediately.";

        $this->sendEmail($email, '🔑 Your password was changed — Recruitment Platform', $html, $text);
    }

    public function sendTwoFactorCodeEmail(string $email, string $firstName, string $code, ?string $tempToken = null): void
    {
        $linkHtml = '';
        $linkText = '';
        
        if ($tempToken) {
            $verifyUrl = env('CLIENT_URL', 'http://localhost:4200') . "/#/auth/two-factor?tempToken=" . urlencode($tempToken);
            $linkHtml = <<<HTML
            <div style="text-align:center;margin:0 0 28px">
                <a href="{$verifyUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">
                  Enter Code Here
                </a>
            </div>
            <p style="margin:20px 0 0;color:#bbb;font-size:11px;word-break:break-all">
                Can't click? Copy this link:<br>{$verifyUrl}
            </p>
HTML;
            $linkText = "\n\nEnter your code here: {$verifyUrl}";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Recruitment Platform</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">Two-Factor Verification</p>
    </div>
    <div style="padding:40px 32px">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px">Hi {$firstName} 👋</h2>
      <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6">
        Use the verification code below to complete your login. It expires in <strong>5 minutes</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:28px;text-align:center;margin:0 0 28px">
        <p style="margin:0 0 8px;color:rgba(255,255,255,.8);font-size:13px;letter-spacing:1px;text-transform:uppercase">Your Verification Code</p>
        <p style="margin:0;color:#fff;font-size:42px;font-weight:800;letter-spacing:12px">{$code}</p>
      </div>
      {$linkHtml}
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
</html>
HTML;

        $text = "Hi {$firstName},\n\nYour verification code is: {$code}\n\nThis code expires in 5 minutes and is single-use.\n\nIf you did not attempt to log in, please secure your account immediately.{$linkText}";

        $this->sendEmail($email, '🔐 Your verification code — Recruitment Platform', $html, $text);
    }

    public function sendOauthVerificationEmail(string $email, string $firstName, string $code, string $tempToken): void
    {
        $verifyUrl = env('CLIENT_URL', 'http://localhost:4200') . "/#/auth/oauth/verify?tempToken=" . urlencode($tempToken) . "&code=" . $code;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#00c6ff,#0072ff);padding:40px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Complete your login</h1>
    </div>
    <div style="padding:40px 32px;text-align:center">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">Hi {$firstName}!</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
        Please enter the code below to complete your login.
      </p>
      <div style="background:linear-gradient(135deg,#00c6ff,#0072ff);padding:24px;border-radius:12px;margin:0 0 24px">
        <h1 style="margin:0;color:#fff;font-size:42px;font-weight:700;letter-spacing:8px">{$code}</h1>
      </div>
      <a href="{$verifyUrl}"
         style="display:inline-block;background:#333;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
        Verify Automatically
      </a>
      <p style="margin:0;color:#999;font-size:13px;border-top:1px solid #eee;padding-top:16px">
        This code expires in <strong>5 minutes</strong>.<br>
        If you didn't request this login, please secure your account.
      </p>
    </div>
  </div>
</body>
</html>
HTML;

        $text = "Hi {$firstName},\n\nPlease enter the code below to complete your login:\n\n{$code}\n\nVerify automatically: {$verifyUrl}\n\nThis code expires in 5 minutes.";

        $this->sendEmail($email, 'Complete your login', $html, $text);
    }
}
