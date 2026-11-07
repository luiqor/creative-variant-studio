import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('serves the static page with a Generate button', async () => {
  const server = createApp().listen(0);
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/`);
  const html = await res.text();
  server.close();
  assert.equal(res.status, 200);
  assert.match(html, /Generate/);
});

const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);
const stub = (input) => ({
  messages: { create: async () => ({ content: [{ type: 'tool_use', name: 'submit_ideas', input }] }) },
});
async function post(client, body) {
  const server = createApp({ client, model: 'm' }).listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  server.close();
  return { status: res.status, json };
}

test('POST /api/generate returns a batch', async () => {
  const input = { hooks: ten('h'), on_screen_texts: ten('t') };
  const { status, json } = await post(stub(input), { script: 'Hook: hi' });
  assert.equal(status, 200);
  assert.deepEqual(json, input);
});

test('POST /api/more-like-this returns 10 cards of the chosen type using all card feedback', async () => {
  const calls = [];
  const client = {
    messages: {
      create: async (params) => {
        calls.push(params);
        return { content: [{ type: 'tool_use', name: 'submit_ideas', input: { hooks: ten('n') } }] };
      },
    },
  };
  const card = (id, type, text, extra = {}) => ({
    id, type, text, state: 'new', likedTags: [], rejectTag: null, comment: '', ...extra,
  });
  const cards = [
    card('1', 'hook', 'Chosen hook', { likedTags: ['humor'], comment: 'cheeky' }),
    card('2', 'hook', 'Bad hook', { state: 'rejected', rejectTag: 'off_brand' }),
    card('3', 'on_screen_text', 'Some overlay'),
  ];
  const server = createApp({ client, model: 'm' }).listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/more-like-this`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cardId: '1', cards }),
  });
  const json = await res.json();
  server.close();
  assert.equal(res.status, 200);
  assert.deepEqual(json, { hooks: ten('n') });
  const prompt = calls[0].messages[0].content;
  for (const expected of ['Chosen hook', 'Bad hook', 'Some overlay', 'Humor', 'cheeky', 'Off-brand']) {
    assert.match(prompt, new RegExp(expected));
  }
});

test('POST /api/more-like-this returns 400 for an unknown card', async () => {
  const server = createApp({ client: stub({}), model: 'm' }).listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/more-like-this`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cardId: 'zzz', cards: [] }),
  });
  server.close();
  assert.equal(res.status, 400);
});

test('POST /api/generate rejects an empty script with 400', async () => {
  const { status, json } = await post(stub({}), { script: '  ' });
  assert.equal(status, 400);
  assert.ok(json.error);
});

test('POST /api/generate returns an error payload after two invalid responses', async () => {
  const { status, json } = await post(stub({ hooks: [] }), { script: 'x' });
  assert.equal(status, 502);
  assert.match(json.error, /try again/i);
});
