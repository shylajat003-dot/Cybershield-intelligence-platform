import { Router } from 'express';
import { IncidentController } from '../controllers/incidentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { incidentSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateToken);

router.get('/', IncidentController.getAll);
router.get('/:id', IncidentController.getById);
router.post('/', requireRole(['ADMIN', 'SECURITY_ANALYST']), validateRequest(incidentSchema), IncidentController.create);
router.put('/:id', requireRole(['ADMIN', 'SECURITY_ANALYST']), IncidentController.update);
router.delete('/:id', requireRole(['ADMIN']), IncidentController.remove);

export default router;
