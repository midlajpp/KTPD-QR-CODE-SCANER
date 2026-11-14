import express from 'express';
import { protectAdmin, requireRole } from '../middleware/auth.js';
import { uploadDesignAsset } from '../middleware/uploadMiddleware.js';
import {
  getDesignSettings,
  saveDraftSettings,
  publishDesignSettings,
  resetDesignSettings,
  uploadDesignImage
} from '../controllers/designController.js';

const router = express.Router();

// All design management routes are protected by admin authentication
router.use(protectAdmin);

router.get('/', requireRole(['superadmin', 'admin']), getDesignSettings);
router.put('/draft', requireRole(['superadmin']), saveDraftSettings);
router.post('/publish', requireRole(['superadmin']), publishDesignSettings);
router.post('/reset', requireRole(['superadmin']), resetDesignSettings);
router.post('/upload', requireRole(['superadmin']), uploadDesignAsset.single('image'), uploadDesignImage);

export default router;

