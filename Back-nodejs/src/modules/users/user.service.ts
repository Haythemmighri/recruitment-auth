import { prisma } from '../../config/database.config';
import { AuthError } from '../auth/auth.service';
import type { UpdateProfileInput } from '../auth/auth.validators';

export class UserService {
  /**
   * Retrieve the authenticated user's own profile.
   * Deliberately excludes sensitive fields: passwordHash, twoFactorSecret.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new AuthError('User not found', 404);
    return user;
  }

  /**
   * Update the authenticated user's own profile (name / phone only).
   * Email changes require a separate re-verification flow (not implemented here
   * to keep scope focused; add as an enhancement).
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Check phone uniqueness if changing it
    if (data.phone) {
      const existing = await prisma.user.findFirst({
        where: { phone: data.phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (existing) throw new AuthError('Phone number is already in use', 409);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        updatedAt: true,
      },
    });
  }
}

export const userService = new UserService();
