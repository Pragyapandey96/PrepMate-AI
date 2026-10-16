import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { ParsedResume } from './resume-parser.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const responseSchema = z.object({
  matches: z.boolean(),
  matchScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  explanation: z.string().min(1).max(800),
});

export type CompatibilityResult = z.infer<typeof responseSchema>;

export class CompatibilityError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'CompatibilityError';
    this.status = status;
  }
}

export function validateCompatibilityInput(resumeText: string, jobDescription: string): void {
  if (typeof resumeText !== 'string' || !resumeText.trim()) throw new CompatibilityError('resume_unreadable', 422);
  if (typeof jobDescription !== 'string' || jobDescription.trim().length < 20) throw new CompatibilityError('job_description_invalid', 400);
}

export async function checkCompatibility(
  resumeText: string,
  resume: ParsedResume | undefined,
  jobDescription: string,
  jd: { title?: string; required?: string[]; preferred?: string[]; responsibilities?: string[] } | undefined,
  generate: (prompt: string) => Promise<string> = async prompt => {
    if (!process.env.GEMINI_API_KEY) throw new CompatibilityError('gemini_api_not_configured', 503);
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_EVAL_MODEL || 'gemini-3.5-flash-lite',
      contents: prompt,
    });
    return response.text || '';
  },
): Promise<CompatibilityResult> {
  validateCompatibilityInput(resumeText, jobDescription);
  const prompt = `Assess how relevant this resume is to the job description. This is a practice-preparation aid, not an objective hiring decision. Evaluate core requirements, skills, work experience, projects, and education only where relevant. Use semantic equivalence, not exact keyword overlap. Do not infer qualifications from silence. A missingSkills item means an important requirement is not demonstrated in the supplied resume, not that the person definitely lacks it. Give a conservative estimated score. matches should mean sufficiently relevant for interview practice.
Return ONLY JSON with exactly this shape: {"matches":boolean,"matchScore":number,"matchedSkills":string[],"missingSkills":string[],"explanation":string}.

Resume structured data:
${JSON.stringify(resume || {})}
Resume text:
${resumeText.slice(0, 40_000)}
Job description:
${jobDescription.slice(0, 20_000)}
Job analysis:
${JSON.stringify(jd || {})}`;

  let result: CompatibilityResult;
  try {
    const raw = (await generate(prompt)).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    result = responseSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof CompatibilityError) throw error;
    throw new CompatibilityError('compatibility_response_invalid');
  }

  const threshold = Number(process.env.RESUME_JD_MATCH_THRESHOLD ?? 55);
  const boundedThreshold = Number.isFinite(threshold) ? Math.max(0, Math.min(100, threshold)) : 55;
  return {
    ...result,
    matches: result.matches && result.matchScore >= boundedThreshold,
    matchedSkills: [...new Set(result.matchedSkills.map(s => s.trim()).filter(Boolean))],
    missingSkills: [...new Set(result.missingSkills.map(s => s.trim()).filter(Boolean))],
  };
}
