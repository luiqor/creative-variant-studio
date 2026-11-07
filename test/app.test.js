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
