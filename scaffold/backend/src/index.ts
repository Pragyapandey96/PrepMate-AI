import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { WebSocketServer } from 'ws';
import http from 'http';

import { resumeRouter } from './routes/resume.js';
import { jdRouter } from './routes/jd.js';
import { interviewRouter } from './routes/interview.js';
import { dashboardRouter } from './routes/dashboard.js';
import { authRouter } from './routes/auth.js';
import { attachVoiceGateway } from './services/voice/gateway.js';
import { errorHandler } from './middleware/error.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/job-description', jdRouter);
app.use('/api/interviews', interviewRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(errorHandler);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/voice', maxPayload: 128 * 1024, perMessageDeflate: false });
attachVoiceGateway(wss);

const PORT = Number(process.env.PORT || 8080);
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

mongoose.connect(MONGO)
  .then(() => {
    // Mongo connection strings can contain credentials; never include them in logs.
    console.log('[db] connected');
    server.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('[db] connection failed', err instanceof Error ? err.name : 'unknown error');
    process.exit(1);
  });
