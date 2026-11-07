import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';

test('startServer serves the page on a free port of the local machine only', async () => {
  const server = await startServer();
  const res = await fetch(server.url);
  const html = await res.text();
  await server.close();
  assert.equal(res.status, 200);
  assert.match(html, /id="app"/);
  assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.ok(server.port > 0);
});

test('two servers started without a port do not clash', async () => {
  const [a, b] = await Promise.all([startServer(), startServer()]);
  assert.notEqual(a.port, b.port);
  await Promise.all([a.close(), b.close()]);
});

test('after close the server no longer answers', async () => {
  const server = await startServer();
  await server.close();
  await assert.rejects(fetch(server.url));
});

test('startServer passes the app options on to the app', async () => {
  const client = {
    models: {
      generateContent: async () => ({ functionCalls: [{ name: 'submit_ideas', args: { hook: ['a'] } }] }),
    },
  };
  const server = await startServer({ client, model: 'm' });
  const res = await fetch(`${server.url}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ script: 's', types: ['hook'], count: 1 }),
  });
  await server.close();
  assert.deepEqual(await res.json(), { hook: ['a'] });
});
