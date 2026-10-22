import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/summary', DashboardController.getSummary);
router.get('/threat-trends', DashboardController.getThreatTrends);
router.get('/threat-severity', DashboardController.getThreatSeverity);
router.get('/threat-types', DashboardController.getThreatsByType);
router.get('/incident-status', DashboardController.getIncidentStatus);
router.get('/vulnerability-summary', DashboardController.getVulnerabilitySummary);
router.get('/top-sources', DashboardController.getTopSources);
router.get('/reports', DashboardController.getReports);

export default router;
