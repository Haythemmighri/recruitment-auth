import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/authenticate.middleware';

const router = Router();

// All user routes require a valid access token
router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);

export default router;
