import express from 'express';
import { login, logout, getMe } from '../controllers/authController.js';
import { protectAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, login);
router.post('/logout', protectAdmin, logout);
router.get('/me', protectAdmin, getMe);

export default router;

