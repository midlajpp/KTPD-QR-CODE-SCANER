import express from 'express';
import { getPublicMemberProfile } from '../controllers/publicController.js';
import { getPublicProfileDesign } from '../controllers/designController.js';

const router = express.Router();

// Public profile endpoint accessed via permanent QR code scan
router.get('/members/:token', getPublicMemberProfile);
router.get('/verify/:token', getPublicMemberProfile);

// Public profile design configuration
router.get('/profile-design', getPublicProfileDesign);

export default router;

