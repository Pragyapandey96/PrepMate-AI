import assert from 'node:assert/strict';
import test from 'node:test';
import { withTransientRetries } from './evaluator.js';

test('retries transient Gemini service errors and returns the successful result', async () => {
  let attempts = 0;
  const waits: number[] = [];
  const result = await withTransientRetries(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error('service unavailable'), { status: 503 });
    return 'evaluation';
  }, async milliseconds => { waits.push(milliseconds); });

  assert.equal(result, 'evaluation');
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [300, 700]);
});

test('does not retry permanent Gemini errors', async () => {
  let attempts = 0;

  await assert.rejects(withTransientRetries(async () => {
    attempts += 1;
    throw Object.assign(new Error('invalid request'), { status: 400 });
  }, async () => {}), /invalid request/);

  assert.equal(attempts, 1);
});

test('stops after the bounded number of transient attempts', async () => {
  let attempts = 0;

  await assert.rejects(withTransientRetries(async () => {
    attempts += 1;
    throw Object.assign(new Error('service unavailable'), { status: 503 });
  }, async () => {}), /service unavailable/);

  assert.equal(attempts, 3);
});
