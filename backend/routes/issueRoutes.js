import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllIssues,
  getIssueById,
  createIssue,
  getMyIssues,
  toggleUpvote,
  deleteIssue,
} from '../controllers/issueController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `issue-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

router.route('/')
  .get(getAllIssues)
  .post(protect, upload.single('image'), createIssue);

router.get('/my-reports', protect, getMyIssues);

router.route('/:id')
  .get(getIssueById)
  .delete(protect, deleteIssue);

router.post('/:id/upvote', protect, toggleUpvote);

export default router;
