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
  const modules = await Promise.all(
    [...mainSource.matchAll(/from '(\.\/[^']+)'/g)].map(([, path]) => fetch(`${base}/js/${path.slice(2)}`)),
  );
  server.close();

  assert.match(html, /<textarea id="script"/);
  assert.match(html, /<button id="new-script"/);
  assert.match(html, /id="error"/);
  assert.match(html, /id="cards"/);
  assert.match(html, /<script type="module" src="\/js\/main\.js">/);
  assert.match(main.headers.get('content-type'), /javascript/);
  assert.equal(stylesheet.status, 200);
  assert.ok(modules.length >= 5);
  assert.ok(mainSource.includes("'./session.js'"));
  assert.ok(modules.every((res) => res.status === 200));
});
