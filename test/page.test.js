import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('the page has the script input, error area and loads its ES modules from the server', async () => {
  const server = createApp().listen(0);
  const base = `http://localhost:${server.address().port}`;
  const html = await fetch(`${base}/`).then((res) => res.text());
  const main = await fetch(`${base}/js/main.js`);
  const mainSource = await main.text();
  const stylesheet = await fetch(`${base}/styles.css`);
  const imported = [...mainSource.matchAll(/from '\.\/([^']+)'/g)].map(([, path]) => `/js/${path}`);
  const expected = [
    'cards.js',
    'render.js',
    'api.js',
    'more-like-this.js',
    'session.js',
    'export-ui.js',
    'action-events.js',
  ].map((name) => `/js/${name}`);
  const statuses = await Promise.all(expected.map((path) => fetch(`${base}${path}`).then((res) => res.status)));
  server.close();

  assert.match(html, /<textarea id="script"/);
  assert.match(html, /<button id="new-script"/);
  assert.match(html, /id="error"/);
  assert.match(html, /id="cards"/);
  assert.match(html, /<script type="module" src="\/js\/main\.js">/);
  assert.match(main.headers.get('content-type'), /javascript/);
  assert.equal(stylesheet.status, 200);
  assert.deepEqual([...imported].sort(), [...expected].sort());
  assert.deepEqual(statuses, expected.map(() => 200));
});
