import express from 'express';
import multer from 'multer';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  toggleMemberStatus,
  getMemberQr,
  getMemberProfileUrl,
  importCsv,
  previewCsvImport,
  exportMembers,
  exportQrZip,
  exportCompleteZip,
  downloadTemplate,
  exportIllustratorZip
} from '../controllers/memberController.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Memory storage for CSV uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All member management endpoints are protected by protectAdmin middleware
router.use(protectAdmin);

// CSV import, export, template (Superadmin & Admin only)
router.post('/import/preview', requireRole(['superadmin', 'admin']), upload.single('file'), previewCsvImport);
router.post('/import', requireRole(['superadmin', 'admin']), upload.single('file'), importCsv);
router.get('/export/qr-zip', requireRole(['superadmin', 'admin']), exportQrZip);
router.get('/export/all', requireRole(['superadmin', 'admin']), exportCompleteZip);
router.get('/export', requireRole(['superadmin', 'admin']), exportMembers);
router.get('/template', requireRole(['superadmin', 'admin']), downloadTemplate);

// Bulk QR export (backward-compatibility alias)
router.get('/qr/export', requireRole(['superadmin', 'admin']), exportIllustratorZip);

// Core CRUD operations
router.get('/', getMembers); // Viewable by superadmin, admin, staff
router.post('/bulk-delete', requireRole(['superadmin', 'admin']), bulkDeleteMembers);
router.delete('/bulk', requireRole(['superadmin', 'admin']), bulkDeleteMembers);
router.post('/', requireRole(['superadmin', 'admin']), createMember);
router.get('/:id', getMemberById); // Viewable by superadmin, admin, staff
router.put('/:id', requireRole(['superadmin', 'admin']), updateMember);
router.delete('/:id', requireRole(['superadmin', 'admin']), deleteMember);
router.patch('/:id/status', requireRole(['superadmin', 'admin']), toggleMemberStatus);

// Individual Member QR and Profile URL (Viewable by superadmin, admin, staff)
router.get('/:id/qr', getMemberQr);
router.get('/:id/profile-url', getMemberProfileUrl);

export default router;

