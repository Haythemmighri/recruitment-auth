import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response.util';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 *
 * Usage:
 *   router.get('/admin/users', authenticate, authorize(Role.ADMIN), handler)
 *   router.get('/jobs', authenticate, authorize(Role.RECRUITER, Role.ADMIN), handler)
 *
 * Security decisions:
 * - Always checks req.user first (ensures authenticate ran before authorize).
 * - Returns 401 if not authenticated (should never happen when chained correctly).
 * - Returns 403 Forbidden (not 404) for insufficient role — reveals resource
 *   exists but access is denied. This is intentional; 404 can be used for
 *   extra hiding but 403 provides clearer API semantics.
 * - Role list is evaluated as a union (OR) — user needs any one of the roles.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // This should not happen when authenticate is chained before authorize
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Required role(s): ${roles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
}
