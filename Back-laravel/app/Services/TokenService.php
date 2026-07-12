<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Helpers\CryptoHelper;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class TokenService
{
    private string $accessSecret;
    private string $refreshSecret;
    private int $accessTtlMinutes;
    private int $refreshTtlMinutes;

    public function __construct()
    {
        $this->accessSecret      = env('JWT_ACCESS_SECRET', 'dev_access_secret_32_chars_min!!');
        $this->refreshSecret     = env('JWT_REFRESH_SECRET', 'dev_refresh_secret_32_chars_min!');
        $this->accessTtlMinutes  = (int) env('JWT_ACCESS_TTL', 15);      // 15 minutes
        $this->refreshTtlMinutes = (int) env('JWT_REFRESH_TTL', 10080);  // 7 days
    }

    // ─── Sign access token (15 min) ────────────────────────────────────────────
    public function signAccessToken(string $userId, string $email, string $role): string
    {
        $now = time();
        $payload = [
            'sub'   => $userId,
            'email' => $email,
            'role'  => $role,
            'jti'   => CryptoHelper::generateUUID(),
            'iat'   => $now,
            'exp'   => $now + ($this->accessTtlMinutes * 60),
        ];
        return JWT::encode($payload, $this->accessSecret, 'HS256');
    }

    // ─── Sign refresh token (7 days) ───────────────────────────────────────────
    public function signRefreshToken(string $userId, string $family): string
    {
        $now = time();
        $payload = [
            'sub'    => $userId,
            'family' => $family,
            'jti'    => CryptoHelper::generateUUID(),
            'iat'    => $now,
            'exp'    => $now + ($this->refreshTtlMinutes * 60),
        ];
        return JWT::encode($payload, $this->refreshSecret, 'HS256');
    }

    // ─── Sign temp token for pending 2FA (5 min) ──────────────────────────────
    public function signTempToken(string $userId): string
    {
        $now = time();
        $payload = [
            'sub'     => $userId,
            'purpose' => 'two_factor',
            'iat'     => $now,
            'exp'     => $now + 300, // 5 minutes
        ];
        return JWT::encode($payload, $this->accessSecret, 'HS256');
    }

    // ─── Verify access token ───────────────────────────────────────────────────
    public function verifyAccessToken(string $token): object
    {
        return JWT::decode($token, new Key($this->accessSecret, 'HS256'));
    }

    // ─── Verify refresh token ──────────────────────────────────────────────────
    public function verifyRefreshToken(string $token): object
    {
        return JWT::decode($token, new Key($this->refreshSecret, 'HS256'));
    }

    // ─── Verify temp 2FA token ─────────────────────────────────────────────────
    public function verifyTempToken(string $token): object
    {
        $payload = JWT::decode($token, new Key($this->accessSecret, 'HS256'));
        if (($payload->purpose ?? '') !== 'two_factor') {
            throw new \Exception('Invalid token purpose');
        }
        return $payload;
    }

    // ─── Issue a full token pair ───────────────────────────────────────────────
    public function issueTokenPair(
        string $userId,
        string $email,
        string $role,
        string $ipAddress,
        string $userAgent,
        ?string $existingFamily = null
    ): array {
        $family       = $existingFamily ?? CryptoHelper::generateUUID();
        $accessToken  = $this->signAccessToken($userId, $email, $role);
        $rawRefresh   = $this->signRefreshToken($userId, $family);
        $refreshHash  = CryptoHelper::hashToken($rawRefresh);
        $refreshTtlMs = $this->refreshTtlMinutes * 60 * 1000;

        RefreshToken::create([
            'id'         => CryptoHelper::generateCuid(),
            'user_id'    => $userId,
            'token_hash' => $refreshHash,
            'family'     => $family,
            'expires_at' => now()->addMinutes($this->refreshTtlMinutes),
            'ip_address' => $ipAddress,
            'user_agent' => substr($userAgent, 0, 500),
            'created_at' => now(),
        ]);

        return [
            'accessToken'  => $accessToken,
            'refreshToken' => $rawRefresh,
            'refreshTtlMs' => $refreshTtlMs,
        ];
    }

    // ─── Revoke an entire token family ─────────────────────────────────────────
    public function revokeTokenFamily(string $family): void
    {
        try {
            RefreshToken::where('family', $family)
                ->where('revoked', false)
                ->update(['revoked' => true]);
        } catch (\Throwable $e) {
            Log::error('Failed to revoke token family', ['family' => $family, 'error' => $e->getMessage()]);
        }
    }

    public function getRefreshTtlMs(): int
    {
        return $this->refreshTtlMinutes * 60 * 1000;
    }
}
