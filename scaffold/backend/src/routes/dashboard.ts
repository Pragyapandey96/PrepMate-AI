import { Router } from 'express';
import { Interview } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard
dashboardRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const items = await Interview.find({ userId: req.userId, status: 'evaluated' })
      .populate('jdId', 'title company')
      .sort({ createdAt: -1 })
      .select('overallScore evaluation.scores createdAt jdId type');
    const total = items.length;
    const scores = items.map(i => i.overallScore).filter((score): score is number => typeof score === 'number');
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const technical = items.map(i => (i.evaluation as any)?.scores?.technical).filter((score): score is number => typeof score === 'number');
    const communication = items.map(i => (i.evaluation as any)?.scores?.communication).filter((score): score is number => typeof score === 'number');
    const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const recent = items.slice(0, 5);
    res.json({ total, avg, bestTechnical: technical.length ? Math.max(...technical) : 0, avgCommunication: mean(communication), recent, trend: items.slice(0, 12).reverse().map(i => ({ date: i.createdAt, score: i.overallScore })) });
  } catch (e) { next(e); }
});
