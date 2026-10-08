import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AnalyzedJD {
  title: string;
  company?: string;
  required: string[];
  preferred: string[];
  responsibilities: string[];
  experience?: string;
}

export async function analyzeJD(text: string): Promise<AnalyzedJD> {
  const prompt = `Extract structured JSON from this job description. Return ONLY JSON matching this schema:
{ "title": string, "company": string|null, "required": string[], "preferred": string[], "responsibilities": string[], "experience": string|null }

JD:
${text}`;

  const model = process.env.GEMINI_EVAL_MODEL || 'gemini-3.5-flash-lite';
  const resp = await ai.models.generateContent({ model, contents: prompt });
  const raw = resp.text || '';
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return { title: 'Unknown role', required: [], preferred: [], responsibilities: [] };
  }
}
