import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { userService } from './user.service';
import { AuthError } from '../auth/auth.service';
import { updateProfileSchema } from '../auth/auth.validators';
import { sendSuccess, sendError } from '../../utils/response.util';
import { auditLog, AuditEvents } from '../../middleware/auditLog.middleware';
import { logger } from '../../config/logger.config';

export const userController = {
  // GET /users/me
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await userService.getProfile(req.user!.id);
      sendSuccess(res, profile, 'Profile retrieved');
    } catch (e) {
      if (e instanceof AuthError) { sendError(res, e.message, e.statusCode); return; }
      logger.error('[user.controller] getProfile', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },

  // PATCH /users/me
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = updateProfileSchema.parse(req.body);
      const updated = await userService.updateProfile(req.user!.id, data);
      await auditLog(req, AuditEvents.PROFILE_UPDATED);
      sendSuccess(res, updated, 'Profile updated successfully');
    } catch (e) {
      if (e instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of e.errors) {
          const f = issue.path.join('.') || 'root';
          if (!errors[f]) errors[f] = [];
          errors[f].push(issue.message);
        }
        sendError(res, 'Validation failed', 422, errors);
        return;
      }
      if (e instanceof AuthError) { sendError(res, e.message, e.statusCode); return; }
      logger.error('[user.controller] updateProfile', { error: e });
      sendError(res, 'Internal server error', 500);
    }
  },
};
