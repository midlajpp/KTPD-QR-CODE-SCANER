import express from 'express';
import {
  getFields,
  getFieldById,
  createField,
  updateField,
  reorderFields,
  toggleField,
  deleteField,
  getPublicFields,
  getChildFields,
  addChildField,
  updateChildField,
  deleteChildField,
  reorderChildFields,
  deleteFieldOption,
  deleteChildFieldOption
} from '../controllers/fieldController.js';
import { protectAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public route for public QR field schema
router.get('/public', getPublicFields);

// Protected admin routes
router.use(protectAdmin);

// Base collection routes
router.get('/', getFields); // Viewable by superadmin, admin, staff
router.post('/', requireRole(['superadmin', 'admin']), createField);
router.put('/reorder', requireRole(['superadmin', 'admin']), reorderFields);

// Nested option deletion routes (Superadmin & Admin only)
router.delete('/:id/children/:childId/options/:optionName', requireRole(['superadmin', 'admin']), deleteChildFieldOption);
router.delete('/:id/children/:childId/options', requireRole(['superadmin', 'admin']), deleteChildFieldOption);
router.delete('/:id/options/:optionName', requireRole(['superadmin', 'admin']), deleteFieldOption);
router.delete('/:id/options', requireRole(['superadmin', 'admin']), deleteFieldOption);

// Nested sub-field routes (registered before single-segment /:id)
router.get('/:id/children', getChildFields); // Viewable by superadmin, admin, staff
router.post('/:id/children', requireRole(['superadmin', 'admin']), addChildField);
router.put('/:id/children/reorder', requireRole(['superadmin', 'admin']), reorderChildFields);
router.put('/:id/children/:childId', requireRole(['superadmin', 'admin']), updateChildField);
router.delete('/:id/children/:childId', requireRole(['superadmin', 'admin']), deleteChildField);

// Base single-field routes by ID
router.get('/:id', getFieldById); // Viewable by superadmin, admin, staff
router.put('/:id', requireRole(['superadmin', 'admin']), updateField);
router.patch('/:id/toggle', requireRole(['superadmin', 'admin']), toggleField);
router.delete('/:id', requireRole(['superadmin', 'admin']), deleteField);

export default router;
