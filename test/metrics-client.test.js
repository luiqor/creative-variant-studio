import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportEvent } from '../public/js/metrics.js';

test('reportEvent posts the event as JSON to /api/events', () => {
  const calls = [];
  reportEvent('kept', { cardId: 'c1' }, (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true });
  });
  assert.equal(calls[0].url, '/api/events');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { type: 'kept', cardId: 'c1' });
});

test('reportEvent never throws or rejects, even when fetch fails', async () => {
  const rejecting = () => Promise.reject(new Error('offline'));
  const throwing = () => {
    throw new Error('boom');
  };
  assert.doesNotThrow(() => reportEvent('kept', {}, rejecting));
  assert.doesNotThrow(() => reportEvent('kept', {}, throwing));
  await new Promise((resolve) => setImmediate(resolve));
});
