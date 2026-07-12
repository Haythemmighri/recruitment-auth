import { Request, Response } from 'express';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';

import { prisma } from '../../config/database.config';
import { sendSuccess, sendError } from '../../utils/response.util';
import { auditLog, AuditEvents } from '../../middleware/auditLog.middleware';
import { logger } from '../../config/logger.config';

// ─── Validators ───────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(UserStatus).join(', ')}`,
    }),
  }),
  reason: z.string().max(500).optional(),
});

const auditLogQuerySchema = paginationSchema.extend({
  event: z.string().max(100).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime({ message: 'startDate must be ISO 8601' }).optional(),
  endDate: z.string().datetime({ message: 'endDate must be ISO 8601' }).optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const adminController = {
  // GET /admin/users
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, role, status } = paginationSchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (role) where.role = role;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
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
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      sendSuccess(res, users, 'Users retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (e) {
      logger.error('[admin] listUsers', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },

  // GET /admin/users/:id
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
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
          _count: {
            select: {
              loginAttempts: true,
              refreshTokens: true,
            },
          },
        },
      });

      if (!user) { sendError(res, 'User not found', 404); return; }
      sendSuccess(res, user);
    } catch (e) {
      logger.error('[admin] getUserById', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },

  // PATCH /admin/users/:id/status
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = updateStatusSchema.parse(req.body);

      // Admins cannot change their own status (prevent self-lockout)
      if (id === req.user!.id) {
        sendError(res, 'You cannot change your own account status', 400);
        return;
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true },
      });

      if (!target) { sendError(res, 'User not found', 404); return; }

      const updated = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, email: true, status: true },
      });

      // Suspending a user revokes all their active sessions immediately
      if (status === UserStatus.SUSPENDED) {
        await prisma.refreshToken.updateMany({
          where: { userId: id, revoked: false },
          data: { revoked: true },
        });
      }

      await auditLog(req, AuditEvents.ADMIN_USER_STATUS_CHANGED, req.user!.id, {
        targetUserId: id,
        targetEmail: target.email,
        newStatus: status,
        reason,
      });

      sendSuccess(res, updated, `User status updated to ${status}`);
    } catch (e) {
      if (e instanceof z.ZodError) {
        sendError(res, 'Validation failed', 422);
        return;
      }
      logger.error('[admin] updateUserStatus', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },

  // GET /admin/audit-logs
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, event, userId, startDate, endDate } =
        auditLogQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (event) where.event = event;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        const createdAt: Record<string, Date> = {};
        if (startDate) createdAt.gte = new Date(startDate);
        if (endDate) createdAt.lte = new Date(endDate);
        where.createdAt = createdAt;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      sendSuccess(res, logs, 'Audit logs retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (e) {
      logger.error('[admin] getAuditLogs', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },

  // GET /admin/login-attempts
  async getLoginAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, userId } = paginationSchema
        .extend({ userId: z.string().optional() })
        .parse(req.query);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;

      const [attempts, total] = await Promise.all([
        prisma.loginAttempt.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.loginAttempt.count({ where }),
      ]);

      sendSuccess(res, attempts, 'Login attempts retrieved', 200, {
        page, limit, total, totalPages: Math.ceil(total / limit),
      });
    } catch (e) {
      logger.error('[admin] getLoginAttempts', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },
};
