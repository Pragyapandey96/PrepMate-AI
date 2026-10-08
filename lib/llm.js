// LLM wrapper — uses window.genspark.complete for interview turns + evaluation.
// Exposed on window.LLM.

(function () {
  const genspark = () => window.genspark || window.claude || null;

  function buildInterviewerSystemPrompt({ resume, jd, config, questionsAsked, questionsTotal }) {
    return `You are PrepMate AI, a professional voice interviewer for a job interview.

CANDIDATE RESUME (summarized):
Name: ${resume.name}
Headline: ${resume.headline}
Skills: ${resume.skills.join(', ')}
Experience:
${resume.experience.map(e => `- ${e.role} at ${e.company} (${e.dates}): ${e.bullets.join(' ')}`).join('\n')}
Projects:
${resume.projects.map(p => `- ${p.name} (${p.stack}): ${p.blurb}`).join('\n')}
Education: ${resume.education.map(e => `${e.degree}, ${e.school}`).join('; ')}

TARGET ROLE:
Title: ${jd.title} at ${jd.company}
Summary: ${jd.summary}
Required: ${jd.required.join(', ')}
Preferred: ${jd.preferred.join(', ')}
Responsibilities: ${jd.responsibilities.join(' ')}

INTERVIEW CONFIG:
Type: ${config.type}
Difficulty: ${config.difficulty}
Planned questions: ${questionsTotal}
Questions already asked: ${questionsAsked}

STRICT RULES — you MUST follow these:
1. Ask ONE question at a time. Keep it under 40 words. Be conversational but professional.
2. Do NOT number the questions out loud.
3. Do NOT explain the answer, coach, or reveal any score. Just ask.
4. Reference the resume or JD when it makes the question feel personal.
5. Ask follow-ups based on what the candidate just said when appropriate — dig into specifics they mentioned.
6. Match the interview type:
   - HR: motivation, culture fit, career goals.
   - Technical: engineering knowledge, system design, coding concepts.
   - Behavioral: past situations (STAR-friendly prompts).
   - Mixed: rotate across categories.
7. Match difficulty: Easy = broad recall; Medium = applied reasoning; Hard = deep tradeoffs & system design.
8. Do NOT repeat a question you've already asked.
9. Never break character. Never say you are an AI unless directly asked.
10. Respond with ONLY the next question text. No preamble, no meta-commentary.`;
  }

  async function generateOpener(ctx) {
    const gs = genspark();
    if (!gs) return fallbackOpener(ctx);
    try {
      const sys = buildInterviewerSystemPrompt({ ...ctx, questionsAsked: 0 });
      const text = await gs.complete({
        messages: [
          { role: 'user', content: sys + `\n\nBegin the interview. Greet the candidate by first name in one short sentence, then ask your first question in another sentence. Keep the total under 55 words.` }
        ]
      });
      return (text || '').trim() || fallbackOpener(ctx);
    } catch (e) {
      console.warn('LLM opener failed, using fallback', e);
      return fallbackOpener(ctx);
    }
  }

  async function generateNext(ctx, transcript) {
    const gs = genspark();
    if (!gs) return fallbackFollowup(ctx, transcript);
    try {
      const sys = buildInterviewerSystemPrompt(ctx);
      const convo = transcript.map(t => `${t.speaker === 'ai' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.text}`).join('\n');
      const text = await gs.complete({
        messages: [
          { role: 'user', content: sys + `\n\nCONVERSATION SO FAR:\n${convo}\n\nAsk the next question. If the last answer had an interesting detail, ask a follow-up. Otherwise, move to a new topic still relevant to the resume and JD. Respond with ONLY the question, one sentence, under 40 words.` }
        ]
      });
      return (text || '').trim() || fallbackFollowup(ctx, transcript);
    } catch (e) {
      console.warn('LLM next-question failed, using fallback', e);
      return fallbackFollowup(ctx, transcript);
    }
  }

  async function generateClosing(ctx) {
    const gs = genspark();
    if (!gs) return "Thanks — that's all the questions I had. I'll put together your report now.";
    try {
      const text = await gs.complete({
        messages: [
          { role: 'user', content: `You are a professional interviewer wrapping up the interview with ${ctx.resume.name}. Say a short, warm sign-off (under 25 words) and mention that a performance report is coming next. Respond with only the sign-off text.` }
        ]
      });
      return (text || '').trim() || "Thanks — that's all from me. I'll get your report ready.";
    } catch (e) {
      return "Thanks — that's all from me. I'll get your report ready.";
    }
  }

  async function evaluate(ctx, transcript) {
    const gs = genspark();
    if (!gs) return null;
    const sys = `You are an expert interview evaluator. Analyze the interview transcript below and return STRICT JSON matching this schema (no prose, no markdown, no backticks):

{
  "overallScore": number 0-100,
  "scores": {
    "technical": number, "communication": number, "problemSolving": number,
    "relevance": number, "resumeKnowledge": number, "jobFit": number,
    "completeness": number, "confidence": number
  },
  "strengths": [3 short bullet strings],
  "weaknesses": [3 short bullet strings],
  "recommendations": [ { "title": string, "priority": "High"|"Medium"|"Low", "area": string } , ... 3-4 items],
  "questions": [ { "q": string, "a": string, "score": number, "good": string, "missing": string, "better": string } ]
}

For scores: base "confidence" on observable communication signals (pace, filler words, structure) — NOT on claims about the candidate's psychological state. If an answer is very short or missing, score it appropriately low.

CONTEXT:
Role: ${ctx.jd.title}
Type: ${ctx.config.type}, Difficulty: ${ctx.config.difficulty}
Required skills: ${ctx.jd.required.join(', ')}
Resume skills: ${ctx.resume.skills.join(', ')}

TRANSCRIPT:
${transcript.map(t => `${t.speaker === 'ai' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.text}`).join('\n')}

Return ONLY the JSON object.`;
    try {
      const text = await gs.complete({ messages: [{ role: 'user', content: sys }] });
      // Strip any accidental code fences
      const cleaned = (text || '').trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Evaluation failed', e);
      return null;
    }
  }

  // --- Fallbacks used if genspark.complete is unavailable ---
  function fallbackOpener(ctx) {
    return `Hello ${ctx.resume.name.split(' ')[0]}, thanks for joining. I've reviewed your resume and the ${ctx.jd.title} role. Let's start — could you tell me about the most challenging project on your resume?`;
  }
  const FALLBACK_Qs = {
    Technical: [
      "You mentioned MongoDB in one of your projects. Why did you pick it over a relational database?",
      "Walk me through what happens when a request hits your Express API — from middleware to response.",
      "How would you index a Postgres table with millions of rows queried by user_id and created_at?",
      "Design a rate limiter for a public REST API. What algorithm and storage would you use?",
      "How do you handle failures when your service publishes an event after a database write?",
    ],
    HR: [
      "What draws you to this specific role at this company?",
      "Where do you see yourself in two years?",
      "What kind of team environment helps you do your best work?",
    ],
    Behavioral: [
      "Tell me about a time you disagreed with a teammate on a technical decision. What happened?",
      "Describe a project that didn't go as planned. What did you do?",
      "Give me an example of feedback that changed how you work.",
    ],
    Mixed: [
      "Tell me about the metric you're most proud of moving in your current role.",
      "How would you approach the first 30 days if you got this job?",
      "What's a technical concept you learned recently that you'd want to apply here?",
    ],
  };
  function fallbackFollowup(ctx, transcript) {
    const pool = FALLBACK_Qs[ctx.config.type] || FALLBACK_Qs.Mixed;
    const askedTexts = transcript.filter(t => t.speaker === 'ai').map(t => t.text);
    const remaining = pool.filter(q => !askedTexts.some(a => a.includes(q.slice(0, 20))));
    return remaining[0] || pool[Math.floor(Math.random() * pool.length)];
  }

  window.LLM = { generateOpener, generateNext, generateClosing, evaluate };
})();
