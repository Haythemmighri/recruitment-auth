<?php

namespace App\Services;

use App\Helpers\CryptoHelper;
use App\Models\EmailVerificationToken;
use App\Models\LoginAttempt;
use App\Models\PasswordResetToken;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthService
{
    public function __construct(
        private TokenService $tokenService,
        private EmailService $emailService
    ) {}

    // ─── Register ──────────────────────────────────────────────────────────────
    public function register(array $data): array
    {
        // 1. Uniqueness checks handled by FormRequest

        // 2. Hash password with Argon2id
        $passwordHash = Hash::driver('argon2id')->make($data['password']);

        // 3. Create user
        $user = User::create([
            'id'            => CryptoHelper::generateCuid(),
            'first_name'    => $data['firstName'],
            'last_name'     => $data['lastName'],
            'email'         => $data['email'],
            'phone'         => $data['phone'] ?? null,
            'password_hash' => $passwordHash,
            'role'          => $data['role'] ?? 'CANDIDATE',
            'status'        => 'PENDING_VERIFICATION',
        ]);

        // 4. Generate email verification token
        $rawToken = CryptoHelper::generateSecureToken(32);
        $tokenHash = CryptoHelper::hashToken($rawToken);

        EmailVerificationToken::create([
            'id'         => CryptoHelper::generateCuid(),
            'user_id'    => $user->id,
            'token_hash' => $tokenHash,
            'expires_at' => now()->addHours(24),
            'created_at' => now(),
        ]);

        // 5. Send verification email
        try {
            $this->emailService->sendVerificationEmail($user->email, $user->first_name, $rawToken);
        } catch (\Throwable $e) {
            Log::error('Verification email delivery failed', ['userId' => $user->id, 'error' => $e->getMessage()]);
        }

        return ['message' => 'Registration successful. Please check your email to verify your account.'];
    }

    // ─── Verify Email ──────────────────────────────────────────────────────────
    public function verifyEmail(string $rawToken): array
    {
        $tokenHash = CryptoHelper::hashToken($rawToken);

        $record = EmailVerificationToken::with('user')->where('token_hash', $tokenHash)->first();

        if (!$record) {
            throw new \Exception('Invalid verification token', 400);
        }
        if ($record->used) {
            throw new \Exception('This verification link has already been used', 400);
        }
        if ($record->expires_at < now()) {
            throw new \Exception('Verification link has expired. Please request a new one.', 400);
        }
        if ($record->user->status === 'SUSPENDED') {
            throw new \Exception('Account is suspended. Contact support.', 403);
        }

        \DB::transaction(function () use ($record) {
            $record->update(['used' => true]);
            $record->user->update([
                'is_email_verified' => true,
                'status'            => 'PENDING_APPROVAL',
            ]);
        });

        return ['message' => 'Email verified successfully. You can now log in.'];
    }

    // ─── Login ─────────────────────────────────────────────────────────────────
    public function login(array $data, string $ipAddress, string $userAgent): array
    {
        $user = User::where('email', $data['email'])->first();

        // Timing-safe password check
        $passwordValid = false;
        if ($user && $user->password_hash) {
            $passwordValid = Hash::driver('argon2id')->check($data['password'], $user->password_hash);
        } else {
            // Dummy check
            Hash::driver('argon2id')->check($data['password'], Hash::driver('argon2id')->make('dummy'));
        }

        $logAttempt = function (bool $success, ?string $reason = null) use ($user, $data, $ipAddress) {
            try {
                LoginAttempt::create([
                    'id'             => CryptoHelper::generateCuid(),
                    'user_id'        => $user?->id,
                    'email'          => $data['email'],
                    'ip_address'     => $ipAddress,
                    'success'        => $success,
                    'failure_reason' => $reason,
                    'created_at'     => now(),
                ]);
            } catch (\Throwable $e) {}
        };

        if (!$user || !$passwordValid) {
            $logAttempt(false, 'invalid_credentials');
            throw new \Exception('Invalid email or password', 401);
        }

        if (!$user->is_email_verified) {
            $logAttempt(false, 'email_not_verified');
            throw new \Exception('Please verify your email address before logging in', 403);
        }

        if ($user->status === 'SUSPENDED') {
            $logAttempt(false, 'account_suspended');
            throw new \Exception('Your account has been suspended. Contact support.', 403);
        }

        if ($user->status === 'PENDING_APPROVAL') {
            $logAttempt(false, 'account_pending_approval');
            throw new \Exception('Your account is pending admin approval', 403);
        }

        if ($user->status !== 'ACTIVE') {
            $logAttempt(false, 'account_inactive');
            throw new \Exception('Account is not active', 403);
        }

        $logAttempt(true);

        $user->update(['last_login_at' => now()]);

        // 2FA check
        if ($user->is_two_factor_enabled) {
            $tempToken = $this->tokenService->signTempToken($user->id);
            return ['requiresTwoFactor' => true, 'tempToken' => $tempToken];
        }

        return $this->tokenService->issueTokenPair($user->id, $user->email, $user->role, $ipAddress, $userAgent);
    }

    // ─── Refresh Token ─────────────────────────────────────────────────────────
    public function refreshToken(string $rawToken, string $ipAddress, string $userAgent): array
    {
        try {
            $payload = $this->tokenService->verifyRefreshToken($rawToken);
        } catch (\Throwable $e) {
            throw new \Exception('Invalid refresh token. Please log in again.', 401);
        }

        $tokenHash = CryptoHelper::hashToken($rawToken);

        $stored = RefreshToken::with('user')->where('token_hash', $tokenHash)->first();

        if (!$stored) {
            Log::warning('Refresh token not found — possible theft, revoking family', [
                'family' => $payload->family,
                'userId' => $payload->sub,
                'ipAddress' => $ipAddress,
            ]);
            $this->tokenService->revokeTokenFamily($payload->family);
            throw new \Exception('Session invalidated. Possible token theft detected. Please log in again.', 401);
        }

        if ($stored->revoked) {
            Log::warning('Revoked refresh token reused — COMPROMISE SIGNAL, revoking family', [
                'family' => $payload->family,
                'userId' => $stored->user_id,
                'ipAddress' => $ipAddress,
            ]);
            $this->tokenService->revokeTokenFamily($payload->family);
            throw new \Exception('Token reuse detected. All sessions revoked. Please log in again.', 401);
        }

        if ($stored->expires_at < now()) {
            throw new \Exception('Session expired. Please log in again.', 401);
        }

        if ($stored->user->status !== 'ACTIVE') {
            throw new \Exception('Account is not active', 403);
        }

        // Rotate
        $stored->update(['revoked' => true]);

        return $this->tokenService->issueTokenPair(
            $stored->user->id,
            $stored->user->email,
            $stored->user->role,
            $ipAddress,
            $userAgent,
            $payload->family
        );
    }

    // ─── Logout ────────────────────────────────────────────────────────────────
    public function logout(string $rawToken): array
    {
        $tokenHash = CryptoHelper::hashToken($rawToken);
        RefreshToken::where('token_hash', $tokenHash)
            ->where('revoked', false)
            ->update(['revoked' => true]);

        return ['message' => 'Logged out successfully'];
    }

    // ─── Forgot Password ───────────────────────────────────────────────────────
    public function forgotPassword(string $email): array
    {
        $safeMessage = ['message' => 'If that email is registered, you will receive a password reset link shortly.'];

        $user = User::where('email', $email)->first();

        if (!$user || $user->status === 'DELETED') {
            return $safeMessage;
        }

        PasswordResetToken::where('user_id', $user->id)
            ->where('used', false)
            ->update(['used' => true]);

        $rawToken = CryptoHelper::generateSecureToken(32);
        $tokenHash = CryptoHelper::hashToken($rawToken);

        PasswordResetToken::create([
            'id'         => CryptoHelper::generateCuid(),
            'user_id'    => $user->id,
            'token_hash' => $tokenHash,
            'expires_at' => now()->addHour(),
            'created_at' => now(),
        ]);

        try {
            $this->emailService->sendPasswordResetEmail($email, $user->first_name, $rawToken);
        } catch (\Throwable $e) {
            Log::error('Password reset email failed', ['userId' => $user->id, 'error' => $e->getMessage()]);
        }

        return $safeMessage;
    }

    // ─── Reset Password ────────────────────────────────────────────────────────
    public function resetPassword(string $rawToken, string $newPassword): array
    {
        $tokenHash = CryptoHelper::hashToken($rawToken);

        $record = PasswordResetToken::with('user')->where('token_hash', $tokenHash)->first();

        if (!$record) {
            throw new \Exception('Invalid or expired reset token', 400);
        }
        if ($record->used) {
            throw new \Exception('This reset link has already been used', 400);
        }
        if ($record->expires_at < now()) {
            throw new \Exception('Reset link has expired. Please request a new one.', 400);
        }
        if ($record->user->status === 'SUSPENDED') {
            throw new \Exception('Account is suspended. Contact support.', 403);
        }

        $newPasswordHash = Hash::driver('argon2id')->make($newPassword);

        \DB::transaction(function () use ($record, $newPasswordHash) {
            $record->update(['used' => true]);
            $record->user->update(['password_hash' => $newPasswordHash]);
            RefreshToken::where('user_id', $record->user_id)
                ->where('revoked', false)
                ->update(['revoked' => true]);
        });

        try {
            $this->emailService->sendPasswordChangedEmail($record->user->email, $record->user->first_name);
        } catch (\Throwable $e) {
            Log::error('Password changed email failed', ['userId' => $record->user_id]);
        }

        return ['message' => 'Password reset successfully. Please log in with your new password.'];
    }
}
