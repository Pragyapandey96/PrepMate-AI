// Very light resume extractor. For production, replace naïve regex passes
// with a proper LLM-driven extraction pass over the plain text.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — pdf-parse ships CommonJS
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedResume {
  name?: string;
  headline?: string;
  skills: string[];
  experience: { role?: string; company?: string; dates?: string; bullets: string[] }[];
  projects:   { name?: string; stack?: string; blurb?: string }[];
  education:  { school?: string; degree?: string; dates?: string }[];
  certifications: string[];
}

export interface ResumeParseResult {
  extracted: ParsedResume;
  sourceText: string;
}

const SKILL_KEYWORDS = [
  'Java','JavaScript','TypeScript','Python','Go','Rust','C++','C#',
  'React','Vue','Angular','Next.js','Node.js','Express','Django','Flask',
  'MongoDB','Postgres','PostgreSQL','MySQL','Redis','SQL','DynamoDB',
  'Docker','Kubernetes','AWS','GCP','Azure','Terraform',
  'REST','GraphQL','WebSocket','Kafka','SQS','RabbitMQ',
  'Git','CI/CD','Jest','Cypress','Playwright','JUnit',
  'DSA','System Design','Algorithms',
];

export async function parseResume(buf: Buffer, mime: string): Promise<ResumeParseResult> {
  let text = '';
  try {
    if (mime === 'application/pdf') {
      const r = await pdfParse(buf);
      text = r.text;
    } else {
      const r = await mammoth.extractRawText({ buffer: buf });
      text = r.value;
    }
  } catch {
    const error = new Error('resume_unreadable') as Error & { status: number };
    error.status = 422;
    throw error;
  }
  if (!text.trim()) {
    const error = new Error('resume_unreadable') as Error & { status: number };
    error.status = 422;
    throw error;
  }
  return { extracted: extractFromText(text), sourceText: text.slice(0, 40_000) };
}

function extractFromText(text: string): ParsedResume {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const skills = SKILL_KEYWORDS.filter(sk => lower.includes(sk.toLowerCase()));
  const name = lines[0]?.length && lines[0].split(/\s+/).length <= 4 ? lines[0] : undefined;

  return {
    name,
    headline: lines[1],
    skills,
    experience: [],   // TODO: hydrate via LLM pass
    projects: [],     // TODO: hydrate via LLM pass
    education: [],    // TODO: hydrate via LLM pass
    certifications: [],
  };
}
