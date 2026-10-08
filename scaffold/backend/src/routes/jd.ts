import { Router } from 'express';
import { z } from 'zod';
import { analyzeJD } from '../services/jd-analyzer.js';
import { JobDescription } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const jdRouter = Router();

// POST /api/job-description/analyze
jdRouter.post('/analyze', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({ text: z.string().min(20).max(20000) }).parse(req.body);
    const analyzed = await analyzeJD(body.text);
    const doc = await JobDescription.create({
      userId: req.userId,
      title: analyzed.title,
      company: analyzed.company,
      raw: body.text,
      extracted: analyzed,
    });
    res.json({ id: doc._id, ...analyzed });
  } catch (e) { next(e); }
});
