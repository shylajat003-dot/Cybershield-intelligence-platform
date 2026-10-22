import { Router } from 'express';
import { AssetController } from '../controllers/assetController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { assetSchema } from '../validators/schemas';

const router = Router();
router.use(authenticateToken);

router.get('/', AssetController.getAll);
router.get('/:id', AssetController.getById);
router.post('/', requireRole(['ADMIN', 'SECURITY_ANALYST']), validateRequest(assetSchema), AssetController.create);
router.put('/:id', requireRole(['ADMIN', 'SECURITY_ANALYST']), AssetController.update);
router.delete('/:id', requireRole(['ADMIN']), AssetController.remove);

export default router;
