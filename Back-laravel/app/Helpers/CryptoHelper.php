<?php

namespace App\Helpers;

class CryptoHelper
{
    /**
     * Generate a cryptographically secure random token.
     * Returns a hex string of length bytes*2.
     */
    public static function generateSecureToken(int $bytes = 32): string
    {
        return bin2hex(random_bytes($bytes));
    }

    /**
     * SHA-256 hash of a raw token — this is stored in the DB.
     * The raw token is sent to the user; only the hash lives in our DB.
     */
    public static function hashToken(string $rawToken): string
    {
        return hash('sha256', $rawToken);
    }

    /**
     * Generate a UUID v4.
     */
    public static function generateUUID(): string
    {
        return \Illuminate\Support\Str::uuid()->toString();
    }

    /**
     * Generate a CUID-style unique ID (used as primary keys).
     */
    public static function generateCuid(): string
    {
        return \Illuminate\Support\Str::ulid()->toString();
    }
}
