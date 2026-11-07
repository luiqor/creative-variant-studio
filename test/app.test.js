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
