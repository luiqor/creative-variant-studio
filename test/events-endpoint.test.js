import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';

const eventsPath = () => join(mkdtempSync(join(tmpdir(), 'app-events-')), 'events.jsonl');
const logged = (path) => readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

async function postEvent(app, body) {
  const server = app.listen(0);
  const res = await fetch(`http://localhost:${server.address().port}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  server.close();
  return res.status;
}

test('POST /api/events appends a client event with a timestamp to the configured log', async () => {
  const path = eventsPath();
  const status = await postEvent(createApp({ eventsPath: path }), { type: 'kept', cardId: 'c1' });
  assert.equal(status, 204);
  const [event] = logged(path);
  assert.equal(event.type, 'kept');
  assert.equal(event.cardId, 'c1');
  assert.ok(!Number.isNaN(Date.parse(event.timestamp)));
});

test('POST /api/events rejects unknown types and does not log them', async () => {
  const path = eventsPath();
  const status = await postEvent(createApp({ eventsPath: path }), { type: 'hacked' });
  assert.equal(status, 400);
  assert.equal(existsSync(path), false);
});

test('a successful /api/generate logs a generated event with the card count; a failure logs nothing', async () => {
  const path = eventsPath();
  const ten = (p) => Array.from({ length: 10 }, (_, i) => `${p} ${i}`);
  const stub = (input) => ({ messages: { create: async () => ({ content: [{ type: 'tool_use', name: 'submit_ideas', input }] }) } });
  const generate = async (app, script) => {
    const server = app.listen(0);
    const res = await fetch(`http://localhost:${server.address().port}/api/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ script }) });
    server.close();
    return res.status;
  };
  const app = createApp({ client: stub({ hooks: ten('h'), on_screen_texts: ten('t') }), model: 'm', eventsPath: path });
  assert.equal(await generate(app, ' '), 400);
  assert.equal(existsSync(path), false);
  assert.equal(await generate(app, 'Hook: hi'), 200);
  const [event] = logged(path);
  assert.equal(event.type, 'generated');
  assert.equal(event.count, 20);
});
