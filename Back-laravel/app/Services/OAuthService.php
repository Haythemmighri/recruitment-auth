<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class OAuthService
{
    public function __construct(
        private TokenService $tokenService,
        private EmailService $emailService
    ) {}

    // ─── OAuth Login (called after Socialite callback) ─────────────────────────
    public function oauthLogin(string $userId, string $ipAddress, string $userAgent): array
    {
        $user = User::find($userId);

        if (!$user) {
            throw new \Exception('User not found', 404);
        }
        if ($user->status === 'SUSPENDED') {
            throw new \Exception('Your account has been suspended. Contact support.', 403);
        }
        if ($user->status === 'DELETED') {
            throw new \Exception('Account not found.', 404);
        }

        $user->update(['last_login_at' => now()]);



        // Always require an email OTP after every OAuth login as an extra
        // identity verification step, regardless of whether the user has
        // explicitly enabled 2FA.
        $tempToken = $this->tokenService->signTempToken($user->id);
        $code = (string) random_int(100000, 999999);

        \Illuminate\Support\Facades\Cache::put("auth:oauth:code:{$user->id}", $code, now()->addMinutes(5));

        $this->emailService->sendOauthVerificationEmail($user->email, $user->first_name, $code, $tempToken);

        return ['requiresOauthVerification' => true, 'tempToken' => $tempToken];
    }

    // ─── Verify OAuth Code (complete OAuth login) ──────────────────────────────
    public function verifyOauthCode(string $tempToken, string $code, string $ipAddress, string $userAgent): array
    {
        try {
            $payload = $this->tokenService->verifyTempToken($tempToken);
        } catch (\Throwable $e) {
            throw new \Exception('Invalid or expired temporary token. Please log in again.', 401);
        }

        $userId = $payload->sub ?? null;
        if (!$userId) {
            throw new \Exception('Invalid temporary token.', 401);
        }

        $cacheKey = "auth:oauth:code:{$userId}";
        $pendingCode = \Illuminate\Support\Facades\Cache::get($cacheKey);

        if (!$pendingCode) {
            throw new \Exception('Verification session expired. Please log in again.', 401);
        }

        $user = User::find($userId);
        if (!$user) {
            throw new \Exception('User not found', 404);
        }

        if ($code !== $pendingCode) {
            throw new \Exception('Invalid verification code. Please try again.', 401);
        }

        if ($user->status === 'PENDING_APPROVAL') {
            \Illuminate\Support\Facades\Cache::forget($cacheKey);
            throw new \Exception(
                'Email verified successfully. Your account is pending activation by an administrator. You will be notified once approved.',
                403
            );
        }

        if ($user->status !== 'ACTIVE') {
            throw new \Exception('Account is not active', 403);
        }

        \Illuminate\Support\Facades\Cache::forget($cacheKey);

        return $this->tokenService->issueTokenPair($user->id, $user->email, $user->role, $ipAddress, $userAgent);
    }

    // ─── Find or Create OAuth User (shared logic) ──────────────────────────────
    public function findOrCreateOAuthUser(string $provider, array $profile): User
    {
        // 1. Look up by provider-specific ID
        $providerField = "{$provider}_id";
        $byProviderId = User::where($providerField, $profile['id'])->first();

        if ($byProviderId) {
            return $byProviderId;
        }

        // 2. Look up by email — link provider ID if found
        $byEmail = User::where('email', $profile['email'])->first();

        if ($byEmail) {
            $updateData = [$providerField => $profile['id']];
            if (!empty($profile['avatarUrl'])) {
                $updateData['avatar_url'] = $profile['avatarUrl'];
            }
            $byEmail->update($updateData);

            Log::info("[oauth] Linked {$provider} to existing account", ['userId' => $byEmail->id]);
            return $byEmail;
        }

        // 3. Brand-new user
        $newUser = User::create([
            'id'                => \App\Helpers\CryptoHelper::generateCuid(),
            'first_name'        => $profile['firstName'],
            'last_name'         => $profile['lastName'],
            'email'             => $profile['email'],
            'avatar_url'        => $profile['avatarUrl'] ?? null,
            'role'              => 'CANDIDATE',
            'status'            => 'PENDING_APPROVAL',  // must be activated by admin
            'is_email_verified' => true,
            $providerField      => $profile['id'],
        ]);

        Log::info("[oauth] Created new user via {$provider}", ['userId' => $newUser->id]);
        return $newUser;
    }
}
