import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('main.js reports card actions and exports through the tracking module', async () => {
  const server = createApp().listen(0);
  const base = `http://localhost:${server.address().port}`;
  const main = await fetch(`${base}/js/main.js`).then((res) => res.text());
  server.close();

  assert.match(main, /from '\.\/action-events\.js'/);
  assert.match(main, /trackAction\(/);
  assert.match(main, /onExported: trackExport/);
});
