import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface EvaluationInput {
  transcript: { speaker: string; text: string }[];
  resume: any;
  jd: any;
  type: string;
  difficulty: string;
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
  const resp = await ai.models.generateContent({ model, contents: prompt });
  const raw = resp.text || '';
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  return JSON.parse(cleaned);
}
