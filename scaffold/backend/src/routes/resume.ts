import { Router } from 'express';
import multer from 'multer';
import { parseResume } from '../services/resume-parser.js';
import { Resume } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export const resumeRouter = Router();

// POST /api/resume/upload
resumeRouter.post('/upload', requireAuth, upload.single('file'), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_missing' });
    if (!['application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          .includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'unsupported_type' });
    }

    const { extracted, sourceText } = await parseResume(req.file.buffer, req.file.mimetype);
    const doc = await Resume.create({
      userId: req.userId,
      filename: req.file.originalname,
      extracted,
      sourceText,
    });
    res.json({ id: doc._id, extracted });
  } catch (e) { next(e); }
});
