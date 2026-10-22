import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', AlertController.getAll);
router.get('/stream', AlertController.streamAlerts);
router.post('/', requireRole(['ADMIN', 'SECURITY_ANALYST']), AlertController.create);
router.put('/:id', requireRole(['ADMIN', 'SECURITY_ANALYST']), AlertController.update);

export default router;
