import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface EvaluationInput {
  transcript: { speaker: string; text: string }[];
  resume: any;
  jd: any;
  type: string;
  difficulty: string;
}

const MAX_GENERATION_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [300, 700];
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'ENOTFOUND']);

function retryDetails(error: unknown): { status?: number; code?: string } {
  if (typeof error !== 'object' || error === null) return {};
  const value = error as { status?: unknown; code?: unknown; cause?: unknown };
  const status = Number(value.status);
  const code = typeof value.code === 'string' ? value.code : undefined;
  if (RETRYABLE_STATUSES.has(status) || (code && RETRYABLE_CODES.has(code))) return { status, code };
  return retryDetails(value.cause);
}

export async function withTransientRetries<T>(
  operation: () => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const details = retryDetails(error);
      if (!details.status && !details.code || attempt >= MAX_GENERATION_ATTEMPTS) throw error;
      console.warn('[evaluation] transient Gemini error; retrying', {
        attempt,
        nextAttempt: attempt + 1,
        status: details.status,
        code: details.code,
      });
      await wait(RETRY_DELAYS_MS[attempt - 1]);
    }
  }
}

export async function evaluateInterview(input: EvaluationInput) {
  const prompt = `You are an expert interview evaluator. Analyze the interview and return STRICT JSON matching this schema (no prose, no markdown):

{
  "overallScore": number 0-100,
  "scores": { "technical": number, "communication": number, "problemSolving": number,
              "relevance": number, "resumeKnowledge": number, "jobFit": number,
              "completeness": number, "confidence": number },
  "strengths": [3 short bullet strings],
  "weaknesses": [3 short bullet strings],
  "recommendations": [ { "title": string, "priority": "High"|"Medium"|"Low", "area": string }, ... 3-4 items ],
  "questions": [ { "q": string, "a": string, "score": number, "good": string, "missing": string, "better": string } ]
}

Base "confidence" on observable communication signals (pace, filler words, structure) — NOT psychological claims.

Context:
Type: ${input.type}, Difficulty: ${input.difficulty}
Resume skills: ${(input.resume?.skills || []).join(', ')}
Required skills: ${(input.jd?.required || []).join(', ')}

Transcript:
${input.transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}

Return ONLY the JSON.`;

  const model = process.env.GEMINI_EVAL_MODEL || 'gemini-3.5-flash-lite';
const resp = await withTransientRetries(() => ai.models.generateContent({ model, contents: prompt }));
  const raw = resp.text || '';
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  return JSON.parse(cleaned);
}
