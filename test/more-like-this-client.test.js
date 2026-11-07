import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestMore, createMoreCards } from '../public/js/more-like-this.js';

test('requestMore posts the cards and chosen card id and returns the batch', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ hooks: ['H'] }) };
  };
  const cards = [{ id: 'a', type: 'hook', text: 'x' }];
  const batch = await requestMore(cards, 'a', fetchFn);
  assert.deepEqual(batch, { hooks: ['H'] });
  assert.equal(calls[0].url, '/api/more-like-this');
  assert.deepEqual(JSON.parse(calls[0].init.body), { cardId: 'a', cards });
});

test('requestMore throws the server error message', async () => {
  const fetchFn = async () => ({ ok: false, status: 502, json: async () => ({ error: 'Failed twice.' }) });
  await assert.rejects(requestMore([], 'a', fetchFn), { message: 'Failed twice.' });
});

test('createMoreCards appends new cards of the batch type after existing ones', () => {
  const existing = [{ id: 'a', type: 'hook', text: 'old', state: 'kept', likedTags: [], rejectTag: null, comment: '' }];
  const next = createMoreCards(existing, { hooks: ['new1', 'new2'] });
  assert.equal(next.length, 3);
  assert.deepEqual(next[0], existing[0]);
  assert.deepEqual(next.slice(1).map((c) => [c.type, c.text, c.state]), [
    ['hook', 'new1', 'new'],
    ['hook', 'new2', 'new'],
  ]);
});
