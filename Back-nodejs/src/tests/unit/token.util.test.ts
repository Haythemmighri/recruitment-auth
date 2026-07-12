import { Role } from '@prisma/client';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/token.util';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

describe('Token Utilities', () => {
  const userId = 'user-123';
  const email = 'test@example.com';
  const role = Role.CANDIDATE;
  const family = 'family-abc';

  describe('Access Tokens', () => {
    it('should sign and verify an access token', () => {
      const token = signAccessToken(userId, email, role);
      expect(typeof token).toBe('string');

      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.role).toBe(role);
      expect(payload.jti).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should throw on invalid signature', () => {
      const token = signAccessToken(userId, email, role);
      const tampered = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyAccessToken(tampered)).toThrow(JsonWebTokenError);
    });
  });

  describe('Refresh Tokens', () => {
    it('should sign and verify a refresh token', () => {
      const token = signRefreshToken(userId, family);
      expect(typeof token).toBe('string');

      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.family).toBe(family);
      expect(payload.jti).toBeDefined();
    });
  });
});
