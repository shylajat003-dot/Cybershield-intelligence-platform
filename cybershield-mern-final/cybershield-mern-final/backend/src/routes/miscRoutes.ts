import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { AuthController } from '../controllers/authController';
import { SearchController } from '../controllers/searchController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Audit logs - Admin only
router.get('/audit-logs', authenticateToken, requireRole(['ADMIN']), AuditController.getAll);

// Users list - Admin only
router.get('/users', authenticateToken, requireRole(['ADMIN']), AuditController.getUsers);

// Me endpoint
router.get('/auth/me', authenticateToken, AuthController.getMe);

// Global search - all authenticated
router.get('/search', authenticateToken, SearchController.globalSearch);

export default router;
