import { Router } from 'express';
import { z } from 'zod';
import { Interview, Resume, JobDescription } from '../models/index.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { evaluateInterview } from '../services/ai/evaluator.js';
import { checkCompatibility, CompatibilityError } from '../services/compatibility.js';

export const interviewRouter = Router();

// POST /api/interviews
interviewRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      resumeId: z.string(),
      jdId: z.string(),
      type: z.enum(['HR', 'Technical', 'Behavioral', 'Mixed']),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']),
      questionsPlanned: z.number().min(3).max(30),
    }).parse(req.body);
    const [resume, jd] = await Promise.all([
      Resume.findOne({ _id: body.resumeId, userId: req.userId }),
      JobDescription.findOne({ _id: body.jdId, userId: req.userId }),
    ]);
    if (!resume || !jd) return res.status(404).json({ error: 'resume_or_job_description_not_found' });
    let compatibility;
    try {
      compatibility = await checkCompatibility(
        resume.sourceText || '', resume.extracted, jd.raw || '', jd.extracted,
      );
    } catch (error) {
      if (error instanceof CompatibilityError) return res.status(error.status).json({ error: error.message });
      throw error;
    }
    if (!compatibility.matches) {
      return res.status(422).json({
        error: 'resume_job_mismatch',
        message: 'Your resume does not appear to match this job description. Please check the job description or upload a more relevant resume.',
        compatibility,
      });
    }
    const doc = await Interview.create({ ...body, userId: req.userId, status: 'created', compatibility });
    res.json(doc);
  } catch (e) { next(e); }
});

// GET /api/interviews
interviewRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const list = await Interview.find({ userId: req.userId })
      .select('jdId type difficulty status overallScore createdAt')
      .populate('jdId', 'title company')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { next(e); }
});

// GET /api/interviews/:id
interviewRouter.get('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const doc = await Interview.findOne({ _id: req.params.id, userId: req.userId }).populate('jdId', 'title company');
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (e) { next(e); }
});

// POST /api/interviews/:id/end — mark ended, trigger evaluation asynchronously
interviewRouter.post('/:id/end', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const doc = await Interview.findOne({ _id: req.params.id, userId: req.userId }).populate('jdId', 'title company');
    if (!doc) return res.status(404).json({ error: 'not_found' });
    if (doc.status === 'evaluated' || doc.status === 'ended') return res.json({ ok: true, status: doc.status });
    if (!doc.compatibility?.matches) {
      const [resume, jd] = await Promise.all([
        Resume.findOne({ _id: doc.resumeId, userId: doc.userId }),
        JobDescription.findOne({ _id: doc.jdId, userId: doc.userId }),
      ]);
      if (!resume || !jd) return res.status(404).json({ error: 'resume_or_job_description_not_found' });
      const compatibility = await checkCompatibility(resume.sourceText || '', resume.extracted, jd.raw || '', jd.extracted);
      doc.compatibility = compatibility;
      if (!compatibility.matches) {
        await doc.save();
        return res.status(422).json({ error: 'resume_job_mismatch', compatibility });
      }
    }
    doc.status = 'ended';
    doc.endedAt = new Date();
    await doc.save();
    // Kick off evaluation in the background
    (async () => {
      try {
        const [resume, jd] = await Promise.all([
          Resume.findOne({ _id: doc.resumeId, userId: doc.userId }),
          JobDescription.findOne({ _id: doc.jdId, userId: doc.userId }),
        ]);
        const evaluation = await evaluateInterview({
          transcript: doc.transcript.map(turn => ({ speaker: turn.speaker || 'user', text: turn.text || '' })),
          resume: resume?.extracted,
          jd: jd?.extracted,
          type: doc.type,
          difficulty: doc.difficulty,
        });
        doc.evaluation = evaluation;
        doc.overallScore = evaluation?.overallScore;
        doc.status = 'evaluated';
        await doc.save();
      } catch (err) {
        console.error('evaluation failed', err);
        doc.status = 'failed';
        await doc.save();
      }
    })();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/interviews/:id/report
interviewRouter.get('/:id/report', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const doc = await Interview.findOne({ _id: req.params.id, userId: req.userId }).populate('jdId', 'title company');
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json({ id: doc.id, status: doc.status, overallScore: doc.overallScore, evaluation: doc.evaluation, type: doc.type, difficulty: doc.difficulty, createdAt: doc.createdAt, endedAt: doc.endedAt, jd: doc.jdId });
  } catch (e) { next(e); }
});
