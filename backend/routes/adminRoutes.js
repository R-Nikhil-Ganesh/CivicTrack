import express from 'express';
import {
  updateIssueStatus,
  assignDepartment,
  getDashboardStats,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('official', 'admin'), getDashboardStats);
router.patch('/issues/:id/status', protect, authorize('official', 'admin'), updateIssueStatus);
router.patch('/issues/:id/assign', protect, authorize('admin'), assignDepartment);

export default router;
