import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `issue-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit for high-res smartphone photos
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|heic|heif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/octet-stream' || file.mimetype.startsWith('image/');
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, WebP, and HEIC images are allowed'));
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
