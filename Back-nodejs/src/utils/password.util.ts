import argon2 from 'argon2';
import { config } from '../config/app.config';

/**
 * Argon2id configuration.
 *
 * Security rationale:
 * - argon2id: Hybrid mode resistant to both GPU attacks (argon2d property)
 *   and side-channel cache-timing attacks (argon2i property).
 * - memoryCost 65536 (64 MB): Forces GPU brute-force to be extremely expensive
 *   because GPUs have limited per-core memory.
 * - timeCost 3: 3 passes over memory — slows down attacker further.
 * - parallelism 4: Uses all CPU threads; attacker must spend 4x resources.
 * - Target: ~200–300ms per hash on modern server hardware.
 */
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: config.security.argon2.memoryCost,
  timeCost: config.security.argon2.timeCost,
  parallelism: config.security.argon2.parallelism,
};

/**
 * Hash a plaintext password using Argon2id.
 *
 * @param password - Plaintext password from user input
 * @returns Argon2id hash string (includes embedded salt and parameters)
 *
 * Note: argon2 automatically generates a cryptographically random salt.
 * The full parameter string and salt are embedded in the output, so no
 * separate salt storage is required.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 *
 * Uses constant-time comparison internally (argon2 library handles this).
 * Returns false instead of throwing for invalid hashes — allows safe use
 * even with corrupted/outdated hash formats.
 *
 * @param hash - The stored Argon2id hash
 * @param password - Plaintext password to verify
 * @returns true if password matches the hash
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // argon2.verify throws on malformed hash strings
    // Return false safely instead of propagating the error
    return false;
  }
}

// ─── Dummy hash for timing normalization ──────────────────────────────────────
// Pre-computed once at module load. Used in login to prevent user enumeration
// via timing differences between "user not found" and "wrong password" paths.

let _dummyHash: string | null = null;

export async function getDummyHash(): Promise<string> {
  if (_dummyHash) return _dummyHash;
  // Use a fixed-but-random salt so the hash is a valid argon2 output
  _dummyHash = await argon2.hash(
    'dummy_timing_normalization_constant_value_xyz',
    ARGON2_OPTIONS
  );
  return _dummyHash;
}
