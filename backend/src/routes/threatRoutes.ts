import { Router } from 'express';
import { ThreatController } from '../controllers/threatController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { threatSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/', ThreatController.getAll);
router.get('/:id', ThreatController.getById);

// Ingest endpoint - Analyst and Admin
router.post('/ingest', requireRole(['ADMIN', 'SECURITY_ANALYST']), ThreatController.ingest);

router.post('/', requireRole(['ADMIN', 'SECURITY_ANALYST']), validateRequest(threatSchema), ThreatController.create);
router.put('/:id', requireRole(['ADMIN', 'SECURITY_ANALYST']), ThreatController.update);
router.delete('/:id', requireRole(['ADMIN']), ThreatController.remove);

export default router;
