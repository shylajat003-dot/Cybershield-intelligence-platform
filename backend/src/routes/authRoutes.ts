import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { authenticateToken } from '../middleware/authMiddleware';
import { registerSchema, loginSchema } from '../validators/schemas';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.getMe);

export default router;

