import { Router } from 'express';
import { Role } from '@prisma/client';
import { adminController } from './admin.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';

const router = Router();

// All admin routes: must be authenticated AND have ADMIN role
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/login-attempts', adminController.getLoginAttempts);

export default router;
