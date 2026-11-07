import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestBatch } from '../public/js/api.js';

const respond = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

test('requestBatch posts the script and returns the batch', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ hooks: ['H'], on_screen_texts: ['T'] }) };
  };
  const batch = await requestBatch('my script', fetchFn);
  assert.deepEqual(batch, { hooks: ['H'], on_screen_texts: ['T'] });
  assert.equal(calls[0].url, '/api/generate');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { script: 'my script' });
});

test('requestBatch throws the server error message', async () => {
  await assert.rejects(requestBatch('x', respond(502, { error: 'Model failed twice.' })), {
    message: 'Model failed twice.',
  });
});

test('requestBatch throws a generic message when the error body is not JSON', async () => {
  const fetchFn = async () => ({
    ok: false,
    status: 500,
    json: async () => {
      throw new SyntaxError('bad json');
    },
  });
  await assert.rejects(requestBatch('x', fetchFn), { message: 'Request failed (500).' });
});

test('requestBatch throws a network message when fetch rejects', async () => {
  const fetchFn = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(requestBatch('x', fetchFn), { message: 'Could not reach the server.' });
});
