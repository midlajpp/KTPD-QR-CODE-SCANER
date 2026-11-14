import express from 'express';
import { getStats, getRecent } from '../controllers/dashboardController.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protectAdmin);

router.get('/stats', getStats); // Accessible by superadmin, admin, staff
router.get('/recent', requireRole(['superadmin', 'admin']), getRecent);

export default router;
