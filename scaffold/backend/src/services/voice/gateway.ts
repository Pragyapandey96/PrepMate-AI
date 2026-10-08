import type { WebSocketServer } from 'ws';
import { WebSpeechProvider } from './web-speech.js';
import { GeminiLiveProvider } from './gemini-live.js';
import type { VoiceProvider } from './provider.js';
import { Interview, Resume, JobDescription } from '../../models/index.js';
import jwt from 'jsonwebtoken';

const requestedProvider = process.env.VOICE_PROVIDER || 'web-speech';
console.log(`[voice] configured provider: ${requestedProvider}`);

export function attachVoiceGateway(wss: WebSocketServer) {
  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const sessionId = url.searchParams.get('sessionId') || '';
      const mode = url.searchParams.get('mode') || 'live';
      const token = url.searchParams.get('token') || '';
      if (mode !== 'live' && mode !== 'text') { ws.close(4400, 'invalid_mode'); return; }
      if (mode === 'live' && requestedProvider !== 'gemini-live') {
        ws.send(JSON.stringify({ type: 'error', message: 'Live voice is not configured. Switch to the text interview.' }));
        ws.close(4403, 'live_voice_not_configured');
        return;
      }
      const secret = process.env.JWT_SECRET;
      if (!secret || !token) { ws.close(4401, 'unauthorized'); return; }
      let userId: string;
      try {
        const decoded = jwt.verify(token, secret) as { sub?: string; id?: string };
        userId = decoded.sub || decoded.id || '';
      } catch { ws.close(4401, 'unauthorized'); return; }
      if (!userId) { ws.close(4401, 'unauthorized'); return; }
      const interview = await Interview.findOne({ _id: sessionId, userId });
      if (!interview) { ws.close(4404, 'session_not_found'); return; }
      if (interview.status !== 'created' && interview.status !== 'in_progress') { ws.close(4409, 'session_not_active'); return; }
      interview.status = 'in_progress';
      interview.startedAt ||= new Date();
      await interview.save();
      const [resume, jd] = await Promise.all([
        Resume.findOne({ _id: interview.resumeId, userId }),
        JobDescription.findOne({ _id: interview.jdId, userId }),
      ]);

      const systemPrompt = buildSystemPrompt({ resume: resume?.extracted, jd: jd?.extracted, interview });
      const provider: VoiceProvider = mode === 'live' ? new GeminiLiveProvider() : new WebSpeechProvider();

      await provider.attach(ws, {
        sessionId,
        systemPrompt,
        questionsPlanned: interview.questionsPlanned || 5,
        transcript: interview.transcript.map(turn => ({ speaker: turn.speaker === 'ai' ? 'ai' : 'user', text: turn.text || '' })),
        resume: resume?.extracted,
        jd: jd?.extracted,
        onTranscript: async (turn) => {
          await Interview.updateOne(
            { _id: interview._id, userId: interview.userId },
            { $push: { transcript: { ...turn, ts: new Date() } } },
          );
        },
      });
    } catch (e) {
      console.error('[ws] gateway error', e);
      ws.close(1011, 'gateway_error');
    }
  });
}

function buildSystemPrompt({ resume, jd, interview }: any): string {
  return `You are PrepMate AI, a professional interviewer.
Candidate skills: ${(resume?.skills || []).join(', ')}
Target role: ${jd?.title}
Required: ${(jd?.required || []).join(', ')}
Preferred: ${(jd?.preferred || []).join(', ')}
Type: ${interview.type}, Difficulty: ${interview.difficulty}, Planned questions: ${interview.questionsPlanned}

Rules:
- Ask ONE question at a time, under 40 words.
- Reference the resume or JD to keep questions personal.
- Ask follow-ups on interesting details the candidate mentions.
- Never number questions, never explain answers, never coach mid-interview.
- Never break character.`;
}
