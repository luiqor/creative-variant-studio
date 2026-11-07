import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('the page has JSON and CSV download buttons wired to the export glue module', async () => {
  const server = createApp().listen(0);
  const base = `http://localhost:${server.address().port}`;
  const html = await fetch(`${base}/`).then((res) => res.text());
  const main = await fetch(`${base}/js/main.js`).then((res) => res.text());
  const glue = await fetch(`${base}/js/export-ui.js`);
  server.close();

  assert.match(html, /<button id="export-json"/);
  assert.match(html, /<button id="export-csv"/);
  assert.match(main, /from '\.\/export-ui\.js'/);
  assert.equal(glue.status, 200);
});
