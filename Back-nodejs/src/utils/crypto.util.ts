import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token.
 *
 * @param bytes - Number of random bytes (default 32 → 64 hex chars)
 * @returns Hex-encoded random string
 *
 * Security note: Uses Node.js crypto.randomBytes which reads from the OS CSPRNG.
 * This is safe for use as password reset tokens, email verification links, etc.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for safe database storage using SHA-256.
 *
 * Security note: Raw tokens are NEVER stored in the database.
 * Only the hash is stored. Even if the database is breached,
 * the attacker cannot use the hashed values directly.
 *
 * @param token - The raw token string (hex-encoded)
 * @returns SHA-256 hex digest
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 *
 * Regular string comparison (===) exits early on first mismatch, leaking
 * information about how many characters matched. This function always takes
 * the same time regardless of where the strings differ.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are identical
 */
export function safeCompare(a: string, b: string): boolean {
  // Pad to same length before comparison to avoid length oracle
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Still perform a dummy compare to normalize timing
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a random UUID v4 (used for token families, JTI claims).
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
