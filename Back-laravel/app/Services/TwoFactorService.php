<?php

namespace App\Services;

use App\Models\User;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    public function __construct(
        private TokenService $tokenService,
    ) {}

    // ─── Setup 2FA ─────────────────────────────────────────────────────────────
    public function setupTwoFactor(string $userId): array
    {
        $user = User::find($userId);

        if (!$user) {
            throw new \Exception('User not found', 404);
        }
        if ($user->is_two_factor_enabled) {
            throw new \Exception('Two-factor authentication is already enabled', 409);
        }

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        // Store temporarily in cache
        Cache::put("auth:2fa:setup:{$userId}", $secret, now()->addMinutes(10));

        // Build the otpauth:// URL
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            'RecruitAuth',
            $user->email,
            $secret
        );

        // Render QR code as SVG
        $renderer = new ImageRenderer(
            new RendererStyle(256),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $svg = $writer->writeString($qrCodeUrl);
        $qrCodeDataUrl = 'data:image/svg+xml;base64,' . base64_encode($svg);

        return [
            'data' => [
                'qrCodeDataUrl' => $qrCodeDataUrl,
                'secret'        => $secret,
            ]
        ];
    }

    // ─── Enable 2FA ────────────────────────────────────────────────────────────
    public function enableTwoFactor(string $userId, string $totpCode): array
    {
        $pendingSecret = Cache::get("auth:2fa:setup:{$userId}");

        if (!$pendingSecret) {
            throw new \Exception('Two-factor setup session expired. Please restart setup from /auth/2fa/setup.', 400);
        }

        $google2fa = new Google2FA();
        $isValid = $google2fa->verifyKey($pendingSecret, $totpCode);

        if (!$isValid) {
            throw new \Exception('Invalid verification code. Please try again.', 401);
        }

        User::where('id', $userId)->update([
            'is_two_factor_enabled' => true,
            'two_factor_secret'     => $pendingSecret,
        ]);

        Cache::forget("auth:2fa:setup:{$userId}");

        return ['message' => 'Two-factor authentication enabled successfully.'];
    }

    // ─── Disable 2FA ───────────────────────────────────────────────────────────
    public function disableTwoFactor(string $userId, string $password): array
    {
        $user = User::find($userId);

        if (!$user) {
            throw new \Exception('User not found', 404);
        }
        if (!$user->is_two_factor_enabled) {
            throw new \Exception('Two-factor authentication is not enabled', 400);
        }
        if (!$user->password_hash) {
            throw new \Exception('Password-based authentication is not available for this account', 400);
        }

        $passwordValid = Hash::driver('argon2id')->check($password, $user->password_hash);
        if (!$passwordValid) {
            throw new \Exception('Incorrect password', 401);
        }

        $user->update([
            'is_two_factor_enabled' => false,
            'two_factor_secret'     => null,
        ]);

        return ['message' => 'Two-factor authentication disabled successfully.'];
    }

    // ─── Verify 2FA (complete login) ───────────────────────────────────────────
    public function verifyTwoFactor(string $tempToken, string $totpCode, string $ipAddress, string $userAgent): array
    {
        try {
            $payload = $this->tokenService->verifyTempToken($tempToken);
        } catch (\Throwable $e) {
            throw new \Exception('Invalid or expired temporary token. Please log in again.', 401);
        }

        $userId = $payload->sub;

        $user = User::find($userId);

        if (!$user) {
            throw new \Exception('User not found', 404);
        }
        if ($user->status !== 'ACTIVE') {
            throw new \Exception('Account is not active', 403);
        }
        if (!$user->is_two_factor_enabled || !$user->two_factor_secret) {
            throw new \Exception('Two-factor authentication is not configured properly', 400);
        }

        $google2fa = new Google2FA();
        $isValid = $google2fa->verifyKey($user->two_factor_secret, $totpCode);

        if (!$isValid) {
            throw new \Exception('Invalid verification code. Please try again.', 401);
        }

        return $this->tokenService->issueTokenPair($user->id, $user->email, $user->role, $ipAddress, $userAgent);
    }
}
