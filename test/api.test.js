import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestBatch } from '../public/js/api.js';

const respond = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

test('requestBatch posts the request and returns the batch', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ hook: ['H'], cta: ['C'] }) };
  };
  const request = { script: 'my script', types: ['hook', 'cta'], count: 1, note: '' };
  const batch = await requestBatch(request, fetchFn);
  assert.deepEqual(batch, { hook: ['H'], cta: ['C'] });
  assert.equal(calls[0].url, '/api/generate');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), request);
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
