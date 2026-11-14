import express from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  toggleAccountStatus,
  changeAccountRole,
  resetAccountPassword,
  deleteAccount
} from '../controllers/accountController.js';
import { protectAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All account management routes require active Super Admin authorization
router.use(protectAdmin, requireSuperAdmin);

router.get('/', getAccounts);
router.post('/', createAccount);
router.get('/:id', getAccountById);
router.put('/:id', updateAccount);
router.patch('/:id/status', toggleAccountStatus);
router.patch('/:id/role', changeAccountRole);
router.patch('/:id/password', resetAccountPassword);
router.delete('/:id', deleteAccount);

export default router;

