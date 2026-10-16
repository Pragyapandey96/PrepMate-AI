import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCompatibility, CompatibilityError } from './compatibility.js';

const resume = { skills: ['TypeScript', 'React'], experience: [], projects: [], education: [], certifications: [] };
const resumeText = 'Frontend developer with several years building web applications using TypeScript and React.';
const jd = { title: 'Frontend Developer', required: ['React', 'TypeScript'], preferred: ['GraphQL'], responsibilities: ['Build web applications'] };
const jdText = 'We need a frontend developer to build web applications with React and TypeScript, and collaborate with product. '.repeat(2);

const response = (result: unknown) => async () => JSON.stringify(result);

test('accepts a relevant resume above the configured threshold', async () => {
  const result = await checkCompatibility(resumeText, resume, jdText, jd, response({
    matches: true, matchScore: 88, matchedSkills: ['React', 'TypeScript'], missingSkills: ['GraphQL'], explanation: 'Relevant frontend experience is demonstrated.',
  }));
  assert.equal(result.matches, true);
  assert.equal(result.matchScore, 88);
  assert.deepEqual(result.missingSkills, ['GraphQL']);
});

test('returns a partial match while retaining undisclosed requirements as missing evidence', async () => {
  const result = await checkCompatibility(resumeText, resume, jdText, jd, response({
    matches: true, matchScore: 61, matchedSkills: ['React'], missingSkills: ['TypeScript', 'GraphQL'], explanation: 'Some relevant experience is shown, with other requirements not demonstrated.',
  }));
  assert.equal(result.matches, true);
  assert.equal(result.matchScore, 61);
  assert.equal(result.missingSkills.includes('GraphQL'), true);
});

test('rejects an unrelated resume below the threshold', async () => {
  const result = await checkCompatibility('Experienced pastry chef specializing in French desserts.', { ...resume, skills: ['Baking'] }, jdText, jd, response({
    matches: true, matchScore: 12, matchedSkills: [], missingSkills: ['React', 'TypeScript'], explanation: 'The resume describes pastry work, not frontend development.',
  }));
  assert.equal(result.matches, false);
  assert.equal(result.matchScore, 12);
});

test('reports invalid inputs and malformed AI output distinctly', async () => {
  await assert.rejects(() => checkCompatibility('', resume, jdText, jd, response({})),
    (error: unknown) => error instanceof CompatibilityError && error.message === 'resume_unreadable' && error.status === 422);
  await assert.rejects(() => checkCompatibility(resumeText, resume, 'short', jd, response({})),
    (error: unknown) => error instanceof CompatibilityError && error.message === 'job_description_invalid' && error.status === 400);
  await assert.rejects(() => checkCompatibility(resumeText, resume, jdText, jd, async () => 'not json'),
    (error: unknown) => error instanceof CompatibilityError && error.message === 'compatibility_response_invalid' && error.status === 502);
});
