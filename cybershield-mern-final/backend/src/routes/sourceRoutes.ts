import { Router } from 'express';
import { SourceController } from '../controllers/sourceController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', SourceController.getAll);
router.post('/', requireRole(['ADMIN']), SourceController.create);
router.put('/:id', requireRole(['ADMIN']), SourceController.update);
router.delete('/:id', requireRole(['ADMIN']), SourceController.remove);

export default router;
